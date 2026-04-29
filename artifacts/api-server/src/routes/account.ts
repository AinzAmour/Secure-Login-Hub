import { Router, type IRouter } from "express";
import { db, usersTable, webauthnCredentialsTable, activityEventsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { getSession, requireAuth } from "../lib/session";
import { serializeUser } from "../lib/serializeUser";

const router: IRouter = Router();

router.get("/account/me", requireAuth, async (req, res) => {
  const session = getSession(req);
  const userId = session.userId!;
  const userRows = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const user = userRows[0];
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const creds = await db
    .select({ id: webauthnCredentialsTable.id })
    .from(webauthnCredentialsTable)
    .where(eq(webauthnCredentialsTable.userId, userId));
  res.json({ user: serializeUser(user, creds.length) });
});

router.get("/account/security", requireAuth, async (req, res) => {
  const session = getSession(req);
  const userId = session.userId!;
  const userRows = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const user = userRows[0];
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const creds = await db
    .select({ id: webauthnCredentialsTable.id })
    .from(webauthnCredentialsTable)
    .where(eq(webauthnCredentialsTable.userId, userId));
  res.json({
    email: user.email,
    mpinSet: true,
    faceEnrolled: Array.isArray(user.faceDescriptor) && user.faceDescriptor.length > 0,
    biometricEnrolled: creds.length > 0,
    biometricCount: creds.length,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  });
});

router.get("/account/activity", requireAuth, async (req, res) => {
  const session = getSession(req);
  const userId = session.userId!;
  const events = await db
    .select()
    .from(activityEventsTable)
    .where(eq(activityEventsTable.userId, userId))
    .orderBy(desc(activityEventsTable.createdAt))
    .limit(20);
  res.json(
    events.map((e) => ({
      id: e.id,
      kind: e.kind,
      method: e.method,
      success: e.success,
      createdAt: e.createdAt.toISOString(),
      ipAddress: e.ipAddress,
    })),
  );
});

export default router;
