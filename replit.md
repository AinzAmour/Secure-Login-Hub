# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Project: Sentinel — Multi-Factor Authentication Vault

Sentinel is a high-trust web application that protects financial-grade identity data (Aadhaar) using a layered authentication model designed for Indian users.

### Authentication Model

1. **Registration**
   - Email + 6-digit OTP (free tier: no email provider, the API returns `demoOtp` for the UI to display).
   - Identity capture: full name, 12-digit Aadhaar (encrypted at rest with AES-256-GCM), 6-digit MPIN (bcrypt-hashed).
   - Optional in-browser face enrollment (face-api.js) — only the 128-D descriptor is stored, no images.
   - Optional WebAuthn platform biometric enrollment (Touch ID, Windows Hello, Android fingerprint).

2. **Login**
   - Stage 1: email + 6-digit MPIN → server issues short-lived `challengeToken`.
   - Stage 2: complete with **either** WebAuthn biometric **or** face match (Euclidean distance threshold 0.55).

### Architecture

- `lib/api-spec/openapi.yaml` — single source of truth for the auth/account API. Codegen via `pnpm --filter @workspace/api-spec run codegen`. A post-codegen script `lib/api-spec/fix-barrels.mjs` rewrites `lib/api-zod/src/index.ts` to dedupe orval barrel exports.
- `lib/db/src/schema/users.ts` — Drizzle schema (users, otps, registration_tokens, webauthn_credentials, webauthn_challenges, login_challenges, activity_events). Schema pushed via drizzle-kit.
- `artifacts/api-server` — Express + cookie-session API. Routes:
  - `src/routes/auth.ts` — registration wizard, face enroll, WebAuthn enroll, MPIN lookup, face/biometric login, logout.
  - `src/routes/account.ts` — `me`, `security`, `activity` (auth-protected).
  - `src/lib/crypto.ts` — AES-256-GCM (key derived from `SESSION_SECRET` via scrypt), bcrypt, OTP/token generation.
  - `src/lib/face.ts` — Euclidean distance + match threshold.
  - `src/lib/webauthn.ts` — derives RP ID + origin from request host (proxy-aware).
- `artifacts/secure-mfa` — React + Vite + Wouter front-end. Pages: Landing, Register (6-step wizard), Login (2-stage), Dashboard. Uses `face-api.js` (models loaded from the public CDN) and `@simplewebauthn/browser`.

### Sensitive Data Handling

- Aadhaar number is **never** returned by the API; only `XXXX XXXX <last4>` is exposed via `serializeUser`.
- Face descriptors are 128-float vectors, never images.
- WebAuthn public keys + counters only — no private material on the server.
- Activity log records every register/login/enroll/logout event with success/failure + IP.

### Required Secrets

- `DATABASE_URL` — provisioned PostgreSQL.
- `SESSION_SECRET` — used both for cookie-session signing and AES-256 key derivation.

### Free-tier Caveat

No email integration is configured, so OTPs are returned in the `/auth/register/start` response as `demoOtp` and rendered by the UI inside an info banner. To productize, swap this for a real email connector (e.g. SendGrid) and remove `demoOtp` from the response.

### Workflows

- `artifacts/api-server: API Server` — Express on `$PORT`.
- `artifacts/secure-mfa: web` — Vite dev server on `$PORT`.

### Conventions

- No emojis anywhere in the UI — the visual language is high-trust banking software (deep navy + emerald accent).
- All API mutations call `queryClient.invalidateQueries({ queryKey: getGet*QueryKey() })` after success.
- Backend never logs the OTP value or Aadhaar; it only logs hashed/redacted metadata.

### Cross-device QR Handoff (added)

Sentinel supports completing the **face** or **biometric** factor on a phone instead of the current device. This solves the "I'm signing in on my desktop but my desktop has no fingerprint sensor / front camera / WebAuthn-eligible authenticator" case.

- **Schema**: `handoff_sessions` table (`lib/db/src/schema/users.ts`) — token hash, purpose (`register_face` / `register_biometric` / `login_face` / `login_biometric`), status (`pending` / `completed` / `consumed` / `failed` / `expired`), 5-minute TTL, optional `userId` and `challengeTokenHash`.
- **Routes** (`artifacts/api-server/src/routes/handoff.ts`):
  - `POST /api/handoff/create` — desktop creates a token; returns `mobileUrl = ${origin}/m/h/${token}`.
  - `POST /api/handoff/poll` + `POST /api/handoff/consume` — desktop polls every 1.5s, consumes when status=completed (login flows sign the user in on the desktop session).
  - `GET /api/handoff/m/:token` — mobile fetches purpose + user hint.
  - `POST /api/handoff/m/:token/face` — mobile submits descriptor (enroll or auth match).
  - `POST /api/handoff/m/:token/biometric/options` + `/verify` — mobile WebAuthn (works because both devices hit the same Replit domain → same RP ID).
- **Components**:
  - `src/components/HandoffQR.tsx` — desktop card: shows QR (`qrcode.react`), copyable URL, countdown timer, polls automatically.
  - `src/pages/MobileHandoff.tsx` — phone landing page at `/m/h/:token`: runs `FaceCapture` for face flows or `startRegistration`/`startAuthentication` for biometric, then shows "return to your computer".
- **UI integration**: Register wizard steps 4 & 5, Login stage 2, and Dashboard enroll modal each expose a "This device / Use my phone" toggle.
- **App routing**: `App.tsx` skips the auth-redirect logic for `/m/h/*` paths so an unauthenticated phone visitor isn't bounced to `/login`.

