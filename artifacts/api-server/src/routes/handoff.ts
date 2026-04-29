import { Router, type IRouter, type Request } from "express";
import {
  db,
  usersTable,
  webauthnCredentialsTable,
  loginChallengesTable,
  activityEventsTable,
  handoffSessionsTable,
} from "@workspace/db";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { generateToken, sha256 } from "../lib/crypto";
import { getSession, setSessionUser } from "../lib/session";
import { getRpInfo } from "../lib/webauthn";
import { euclideanDistance, FACE_MATCH_THRESHOLD } from "../lib/face";
import { serializeUser } from "../lib/serializeUser";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";

const router: IRouter = Router();

const HANDOFF_TTL_SECONDS = 300;

const PURPOSES = [
  "register_face",
  "register_biometric",
  "login_face",
  "login_biometric",
] as const;
type Purpose = (typeof PURPOSES)[number];

function getIp(req: Request): string | null {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]!.trim();
  if (Array.isArray(fwd) && fwd[0]) return fwd[0];
  return req.ip ?? null;
}

function publicOrigin(req: Request): string {
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0] ??
    req.protocol ??
    "http";
  const host = req.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

router.post("/handoff/create", async (req, res) => {
  const purpose = req.body?.purpose as Purpose | undefined;
  const challengeToken = req.body?.challengeToken as string | undefined;
  if (!purpose || !PURPOSES.includes(purpose)) {
    res.status(400).json({ error: "Invalid purpose" });
    return;
  }

  let userId: string | null = null;
  let challengeTokenHash: string | null = null;

  if (purpose.startsWith("register_")) {
    const session = getSession(req);
    if (!session.userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    userId = session.userId;
  } else {
    if (!challengeToken) {
      res.status(400).json({ error: "challengeToken is required for login handoffs" });
      return;
    }
    const tokenHash = sha256(challengeToken);
    const rows = await db
      .select()
      .from(loginChallengesTable)
      .where(
        and(
          eq(loginChallengesTable.tokenHash, tokenHash),
          isNull(loginChallengesTable.consumedAt),
          gt(loginChallengesTable.expiresAt, new Date()),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) {
      res.status(400).json({ error: "Login session expired" });
      return;
    }
    userId = row.userId;
    challengeTokenHash = tokenHash;
  }

  const token = generateToken(24);
  const tokenHash = sha256(token);
  const inserted = await db
    .insert(handoffSessionsTable)
    .values({
      tokenHash,
      purpose,
      userId,
      challengeTokenHash,
      status: "pending",
      expiresAt: new Date(Date.now() + HANDOFF_TTL_SECONDS * 1000),
    })
    .returning();
  const handoff = inserted[0]!;

  const origin = publicOrigin(req);
  const mobileUrl = `${origin}/m/h/${token}`;

  res.json({
    handoffId: handoff.id,
    token,
    mobileUrl,
    expiresInSeconds: HANDOFF_TTL_SECONDS,
  });
});

async function loadHandoffByIdAndToken(
  handoffId: string,
  token: string,
) {
  const tokenHash = sha256(token);
  const rows = await db
    .select()
    .from(handoffSessionsTable)
    .where(
      and(
        eq(handoffSessionsTable.id, handoffId),
        eq(handoffSessionsTable.tokenHash, tokenHash),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function loadHandoffByToken(token: string) {
  const tokenHash = sha256(token);
  const rows = await db
    .select()
    .from(handoffSessionsTable)
    .where(eq(handoffSessionsTable.tokenHash, tokenHash))
    .limit(1);
  return rows[0] ?? null;
}

router.post("/handoff/poll", async (req, res) => {
  const { handoffId, token } = req.body ?? {};
  if (!handoffId || !token) {
    res.status(400).json({ error: "Missing handoffId or token" });
    return;
  }
  const handoff = await loadHandoffByIdAndToken(handoffId, token);
  if (!handoff) {
    res.status(404).json({ status: "not_found" });
    return;
  }
  if (handoff.expiresAt < new Date() && handoff.status === "pending") {
    res.json({ status: "expired" });
    return;
  }
  res.json({ status: handoff.status, errorMessage: handoff.errorMessage ?? null });
});

router.post("/handoff/consume", async (req, res) => {
  const { handoffId, token } = req.body ?? {};
  if (!handoffId || !token) {
    res.status(400).json({ error: "Missing handoffId or token" });
    return;
  }
  const handoff = await loadHandoffByIdAndToken(handoffId, token);
  if (!handoff) {
    res.status(404).json({ error: "Handoff not found" });
    return;
  }
  if (handoff.status !== "completed") {
    res.status(400).json({ error: "Handoff is not completed yet" });
    return;
  }
  if (handoff.consumedAt) {
    res.status(400).json({ error: "Handoff already consumed" });
    return;
  }

  await db
    .update(handoffSessionsTable)
    .set({ status: "consumed", consumedAt: new Date() })
    .where(eq(handoffSessionsTable.id, handoff.id));

  if (handoff.purpose.startsWith("register_")) {
    res.json({ ok: true, user: null });
    return;
  }

  // login_* — sign user in on this (desktop) session
  if (!handoff.userId) {
    res.status(500).json({ error: "Handoff missing user reference" });
    return;
  }

  // Also consume the linked login challenge if still active
  if (handoff.challengeTokenHash) {
    await db
      .update(loginChallengesTable)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(loginChallengesTable.tokenHash, handoff.challengeTokenHash),
          isNull(loginChallengesTable.consumedAt),
        ),
      );
  }

  const userRows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, handoff.userId))
    .limit(1);
  const user = userRows[0];
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  setSessionUser(req, user.id);
  await db
    .update(usersTable)
    .set({ lastLoginAt: new Date() })
    .where(eq(usersTable.id, user.id));

  const credCount = await db
    .select({ id: webauthnCredentialsTable.id })
    .from(webauthnCredentialsTable)
    .where(eq(webauthnCredentialsTable.userId, user.id));

  await db.insert(activityEventsTable).values({
    userId: user.id,
    email: user.email,
    kind: "login_success",
    method:
      handoff.purpose === "login_face" ? "face_phone" : "biometric_phone",
    success: true,
    ipAddress: getIp(req),
  });

  res.json({ ok: true, user: serializeUser(user, credCount.length) });
});

router.get("/handoff/m/:token", async (req, res) => {
  const token = req.params["token"];
  if (!token) {
    res.status(400).json({ error: "Missing token" });
    return;
  }
  const handoff = await loadHandoffByToken(token);
  if (!handoff) {
    res.status(404).json({ error: "Handoff not found" });
    return;
  }
  const expired = handoff.expiresAt < new Date() || handoff.status === "expired";

  let userHint: { fullName: string; email: string } | null = null;
  if (handoff.userId) {
    const rows = await db
      .select({ fullName: usersTable.fullName, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, handoff.userId))
      .limit(1);
    if (rows[0]) userHint = rows[0];
  }

  res.json({
    purpose: handoff.purpose,
    status: handoff.status,
    expired,
    userHint,
  });
});

type LoadedHandoff = NonNullable<Awaited<ReturnType<typeof loadHandoffByToken>>>;
type EnsureResult =
  | { ok: true; handoff: LoadedHandoff }
  | { ok: false; error: string; code: number };

async function ensurePendingHandoff(token: string): Promise<EnsureResult> {
  const handoff = await loadHandoffByToken(token);
  if (!handoff) return { ok: false, error: "Handoff not found", code: 404 };
  if (handoff.expiresAt < new Date()) {
    await db
      .update(handoffSessionsTable)
      .set({ status: "expired" })
      .where(eq(handoffSessionsTable.id, handoff.id));
    return { ok: false, error: "Handoff expired", code: 400 };
  }
  if (handoff.status !== "pending") {
    return { ok: false, error: "Handoff is no longer pending", code: 400 };
  }
  return { ok: true, handoff };
}

router.post("/handoff/m/:token/face", async (req, res) => {
  const token = req.params["token"];
  if (!token) {
    res.status(400).json({ error: "Missing token" });
    return;
  }
  const r = await ensurePendingHandoff(token);
  if (!r.ok) {
    res.status(r.code).json({ error: r.error });
    return;
  }
  const { handoff } = r;
  if (handoff.purpose !== "register_face" && handoff.purpose !== "login_face") {
    res.status(400).json({ error: "Wrong handoff purpose for face" });
    return;
  }
  const desc = req.body?.faceDescriptor;
  if (!Array.isArray(desc) || desc.length < 64 || desc.length > 256) {
    res.status(400).json({ error: "Invalid face descriptor" });
    return;
  }
  if (!handoff.userId) {
    res.status(500).json({ error: "Handoff missing user" });
    return;
  }

  if (handoff.purpose === "register_face") {
    await db
      .update(usersTable)
      .set({ faceDescriptor: desc as number[] })
      .where(eq(usersTable.id, handoff.userId));
    await db.insert(activityEventsTable).values({
      userId: handoff.userId,
      kind: "enroll_face",
      method: "face_phone",
      success: true,
      ipAddress: getIp(req),
    });
  } else {
    // login_face — match against stored descriptor
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, handoff.userId))
      .limit(1);
    const user = rows[0];
    if (!user || !Array.isArray(user.faceDescriptor) || user.faceDescriptor.length === 0) {
      await db
        .update(handoffSessionsTable)
        .set({ status: "failed", errorMessage: "Face not enrolled" })
        .where(eq(handoffSessionsTable.id, handoff.id));
      res.status(400).json({ error: "Face not enrolled" });
      return;
    }
    const distance = euclideanDistance(desc as number[], user.faceDescriptor);
    if (distance > FACE_MATCH_THRESHOLD) {
      await db
        .update(handoffSessionsTable)
        .set({ status: "failed", errorMessage: "Face did not match" })
        .where(eq(handoffSessionsTable.id, handoff.id));
      await db.insert(activityEventsTable).values({
        userId: handoff.userId,
        email: user.email,
        kind: "login_failed",
        method: "face_phone",
        success: false,
        ipAddress: getIp(req),
      });
      res.status(401).json({ error: "Face did not match" });
      return;
    }
  }

  await db
    .update(handoffSessionsTable)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(handoffSessionsTable.id, handoff.id));
  res.json({ ok: true });
});

router.post("/handoff/m/:token/biometric/options", async (req, res) => {
  const token = req.params["token"];
  if (!token) {
    res.status(400).json({ error: "Missing token" });
    return;
  }
  const r = await ensurePendingHandoff(token);
  if (!r.ok) {
    res.status(r.code).json({ error: r.error });
    return;
  }
  const { handoff } = r;
  if (
    handoff.purpose !== "register_biometric" &&
    handoff.purpose !== "login_biometric"
  ) {
    res.status(400).json({ error: "Wrong handoff purpose for biometric" });
    return;
  }
  if (!handoff.userId) {
    res.status(500).json({ error: "Handoff missing user" });
    return;
  }

  const userRows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, handoff.userId))
    .limit(1);
  const user = userRows[0];
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const { rpId } = getRpInfo(req);
  const existing = await db
    .select()
    .from(webauthnCredentialsTable)
    .where(eq(webauthnCredentialsTable.userId, user.id));

  let options;
  if (handoff.purpose === "register_biometric") {
    options = await generateRegistrationOptions({
      rpName: "Sentinel",
      rpID: rpId,
      userID: new TextEncoder().encode(user.id),
      userName: user.email,
      userDisplayName: user.fullName,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform",
      },
      excludeCredentials: existing.map((c) => ({
        id: c.credentialId,
        transports:
          (c.transports as AuthenticatorTransportFuture[] | null) ?? undefined,
      })),
    });
  } else {
    if (existing.length === 0) {
      res.status(400).json({ error: "No biometric credentials enrolled" });
      return;
    }
    options = await generateAuthenticationOptions({
      rpID: rpId,
      allowCredentials: existing.map((c) => ({
        id: c.credentialId,
        transports:
          (c.transports as AuthenticatorTransportFuture[] | null) ?? undefined,
      })),
      userVerification: "preferred",
    });
  }

  await db
    .update(handoffSessionsTable)
    .set({ webauthnChallenge: options.challenge })
    .where(eq(handoffSessionsTable.id, handoff.id));

  res.json(options);
});

router.post("/handoff/m/:token/biometric/verify", async (req, res) => {
  const token = req.params["token"];
  if (!token) {
    res.status(400).json({ error: "Missing token" });
    return;
  }
  const r = await ensurePendingHandoff(token);
  if (!r.ok) {
    res.status(r.code).json({ error: r.error });
    return;
  }
  const { handoff } = r;
  if (
    handoff.purpose !== "register_biometric" &&
    handoff.purpose !== "login_biometric"
  ) {
    res.status(400).json({ error: "Wrong handoff purpose for biometric" });
    return;
  }
  if (!handoff.userId || !handoff.webauthnChallenge) {
    res.status(400).json({ error: "Missing challenge — fetch options first" });
    return;
  }
  const userRows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, handoff.userId))
    .limit(1);
  const user = userRows[0];
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const { rpId, origin } = getRpInfo(req);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const credential = req.body?.credential as any;
  if (!credential) {
    res.status(400).json({ error: "Missing credential" });
    return;
  }

  if (handoff.purpose === "register_biometric") {
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge: handoff.webauthnChallenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
        requireUserVerification: false,
      });
    } catch (err) {
      req.log.error({ err }, "Mobile WebAuthn registration verify failed");
      await db
        .update(handoffSessionsTable)
        .set({ status: "failed", errorMessage: "Biometric registration failed" })
        .where(eq(handoffSessionsTable.id, handoff.id));
      res.status(400).json({ error: "Could not verify biometric registration" });
      return;
    }
    if (!verification.verified || !verification.registrationInfo) {
      res.status(400).json({ error: "Biometric registration not verified" });
      return;
    }
    const info = verification.registrationInfo;
    await db.insert(webauthnCredentialsTable).values({
      userId: user.id,
      credentialId: info.credential.id,
      publicKey: Buffer.from(info.credential.publicKey).toString("base64url"),
      counter: info.credential.counter,
      transports: info.credential.transports as string[] | null,
      deviceType: info.credentialDeviceType,
      backedUp: info.credentialBackedUp,
    });
    await db.insert(activityEventsTable).values({
      userId: user.id,
      kind: "enroll_biometric",
      method: "biometric_phone",
      success: true,
      ipAddress: getIp(req),
    });
  } else {
    const credentialId: string | undefined = credential.id ?? credential.rawId;
    if (!credentialId) {
      res.status(400).json({ error: "Missing credential id" });
      return;
    }
    const credRows = await db
      .select()
      .from(webauthnCredentialsTable)
      .where(eq(webauthnCredentialsTable.credentialId, credentialId))
      .limit(1);
    const cred = credRows[0];
    if (!cred || cred.userId !== user.id) {
      res.status(400).json({ error: "Credential not recognized" });
      return;
    }
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: handoff.webauthnChallenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
        credential: {
          id: cred.credentialId,
          publicKey: Buffer.from(cred.publicKey, "base64url"),
          counter: cred.counter,
          transports:
            (cred.transports as AuthenticatorTransportFuture[] | null) ??
            undefined,
        },
        requireUserVerification: false,
      });
    } catch (err) {
      req.log.error({ err }, "Mobile WebAuthn auth verify failed");
      await db
        .update(handoffSessionsTable)
        .set({ status: "failed", errorMessage: "Biometric verification failed" })
        .where(eq(handoffSessionsTable.id, handoff.id));
      await db.insert(activityEventsTable).values({
        userId: user.id,
        email: user.email,
        kind: "login_failed",
        method: "biometric_phone",
        success: false,
        ipAddress: getIp(req),
      });
      res.status(401).json({ error: "Biometric verification failed" });
      return;
    }
    if (!verification.verified) {
      res.status(401).json({ error: "Biometric verification failed" });
      return;
    }
    await db
      .update(webauthnCredentialsTable)
      .set({ counter: verification.authenticationInfo.newCounter })
      .where(eq(webauthnCredentialsTable.id, cred.id));
  }

  await db
    .update(handoffSessionsTable)
    .set({
      status: "completed",
      completedAt: new Date(),
      webauthnChallenge: null,
    })
    .where(eq(handoffSessionsTable.id, handoff.id));

  res.json({ ok: true });
});

// Suppress unused warning
void sql;

export default router;
