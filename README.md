# AuthFusion - Frontend Identity Client (v1.0.0)

AuthFusion is a React + TypeScript identity client focused on high-assurance authentication flows: account onboarding, face/liveness verification, biometric handoff, and verifiable KYC proofs.
The app is organized around route-level pages in [`artifacts/secure-mfa/src/pages`](./artifacts/secure-mfa/src/pages), provider-based app bootstrapping in [`artifacts/secure-mfa/src/App.tsx`](./artifacts/secure-mfa/src/App.tsx), and a reusable UI/component layer in [`artifacts/secure-mfa/src/components`](./artifacts/secure-mfa/src/components).

## Interesting Techniques Used

- Client-side route guarding with controlled redirects using `wouter` and auth query state (`useGetMe`) in [`artifacts/secure-mfa/src/App.tsx`](./artifacts/secure-mfa/src/App.tsx).
- Provider composition for app-wide concerns (query cache, i18n context, notifications, tooltips) in [`artifacts/secure-mfa/src/App.tsx`](./artifacts/secure-mfa/src/App.tsx).
- Scroll-linked motion transforms with Framer Motion (`useScroll`, `useTransform`) for hero fade/scale behavior in [`artifacts/secure-mfa/src/pages/Landing.tsx`](./artifacts/secure-mfa/src/pages/Landing.tsx). See [MDN: CSS and JavaScript animation performance](https://developer.mozilla.org/en-US/docs/Web/Performance/CSS_JavaScript_animation_performance).
- Viewport-triggered animation sequencing (`whileInView`, staggered variants) to progressively reveal feature cards in [`artifacts/secure-mfa/src/pages/Landing.tsx`](./artifacts/secure-mfa/src/pages/Landing.tsx).
- Manual i18n dictionary with runtime interpolation (`{name}` token replacement) in [`artifacts/secure-mfa/src/components/LanguageSwitcher.tsx`](./artifacts/secure-mfa/src/components/LanguageSwitcher.tsx).
- Secure-context web platform usage for authentication and crypto-adjacent features across the app, aligned with [MDN: Secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts).
- PWA packaging and caching strategy using `vite-plugin-pwa` + Workbox in [`artifacts/secure-mfa/vite.config.ts`](./artifacts/secure-mfa/vite.config.ts). See [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps).

## Non-Obvious Libraries and Technologies

- [Wouter](https://github.com/molefrog/wouter) - lightweight routing with minimal runtime overhead.
- [TanStack Query](https://tanstack.com/query/latest) - server-state cache and lifecycle handling for authenticated flows.
- [Framer Motion](https://www.framer.com/motion/) - declarative animation primitives used beyond micro-interactions (scroll coupling + staged reveal).
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/) - service worker and manifest integration.
- [vite-plugin-wasm](https://github.com/Menci/vite-plugin-wasm) and [vite-plugin-top-level-await](https://github.com/Menci/vite-plugin-top-level-await) - enabling browser-side WASM/ML toolchains.
- [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html) and [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js) - client-side inference and liveness pipeline support.
- [SimpleWebAuthn Browser](https://simplewebauthn.dev/docs/packages/browser/) - WebAuthn ceremony support.
- [Reclaim Protocol JS SDK](https://www.npmjs.com/package/@reclaimprotocol/js-sdk) - verifiable claim/proof session integration.
- [Sentry for React](https://docs.sentry.io/platforms/javascript/guides/react/) and [PostHog JS](https://posthog.com/docs/libraries/js) - observability and product analytics.
- [Radix UI](https://www.radix-ui.com/) primitives + Tailwind-based wrappers in [`artifacts/secure-mfa/src/components/ui`](./artifacts/secure-mfa/src/components/ui).
- Font stack configured in [`artifacts/secure-mfa/src/index.css`](./artifacts/secure-mfa/src/index.css): [`Inter`](https://rsms.me/inter/), `Georgia`, and `Menlo`.

## Project Structure

```text
.
├─ artifacts/
│  ├─ secure-mfa/
│  │  ├─ public/
│  │  ├─ src/
│  │  │  ├─ components/
│  │  │  │  └─ ui/
│  │  │  ├─ hooks/
│  │  │  ├─ lib/
│  │  │  │  ├─ liveness/
│  │  │  │  ├─ risk/
│  │  │  │  ├─ zkp/
│  │  │  │  ├─ biometrics/
│  │  │  │  └─ crypto/
│  │  │  ├─ pages/
│  │  │  └─ utils/
│  │  └─ dist/
│  │     └─ public/
│  └─ api-server/
│     └─ src/
├─ lib/
│  ├─ api-zod/
│  └─ db/
├─ scripts/
└─ attached_assets/
```

- [`artifacts/secure-mfa/public`](./artifacts/secure-mfa/public): static app assets and PWA-related public files.
- [`artifacts/secure-mfa/src/pages`](./artifacts/secure-mfa/src/pages): route-level screens (`Landing`, `Login`, `Register`, `Dashboard`, `ReKYC`, `MobileHandoff`).
- [`artifacts/secure-mfa/src/lib`](./artifacts/secure-mfa/src/lib): domain logic for liveness, risk scoring, ZKP, and crypto utilities.
- [`artifacts/secure-mfa/src/components/ui`](./artifacts/secure-mfa/src/components/ui): reusable UI primitives built on Radix patterns.
- [`artifacts/secure-mfa/dist/public`](./artifacts/secure-mfa/dist/public): frontend build output produced by Vite.
- [`attached_assets`](./attached_assets): workspace-level asset bucket referenced via Vite aliasing.
- [`artifacts/api-server/src`](./artifacts/api-server/src): backend routes and APIs used by the frontend auth flows.
