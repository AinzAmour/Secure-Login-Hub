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
