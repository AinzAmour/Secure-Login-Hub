# AuthFusion Identity Platform

[![Security: WebAuthn](https://img.shields.io/badge/Security-WebAuthn-blue.svg)](https://webauthn.io/)
[![Liveness: AI-Powered](https://img.shields.io/badge/Liveness-AI--Powered-green.svg)](https://github.com/justadudewhohacks/face-api.js/)
[![UI: Glassmorphism](https://img.shields.io/badge/UI-Glassmorphism-purple.svg)](https://tailwindcss.com/)

**AuthFusion** is a production-ready, next-generation identity verification platform designed for high-security environments. It combines advanced biometric liveness detection, passwordless WebAuthn authentication, and a multi-stage verification pipeline to ensure that users are who they say they are.

---

## ✨ Key Features

### 🛡️ Multi-Factor Identity Vault
*   **Stage 1: Verified Onboarding**: Dual OTP verification (Email + Phone) to establish a trusted communication channel.
*   **Stage 2: Secure Identity**: Aadhaar-based registration with AES-256-GCM encryption for PII at rest.
*   **Stage 3: MPIN Security**: 6-digit cryptographic PIN as a secure fallback for all biometric factors.

### 🎭 AI Face Liveness Detection
*   **Active Challenges**: Real-time liveness verification using randomized challenges:
    *   😊 Smile detection
    *   👁️ Blink verification
    *   ↔️ Head turns (Left/Right)
    *   ↕️ Vertical alignment (Up/Down)
*   **Local Processing**: Landmarks and descriptors are processed client-side via `face-api.js` — no biometric data ever leaves the user's device.

### 🔑 Passwordless WebAuthn
*   **FIDO2 Compliance**: Support for hardware-backed biometrics (Fingerprint, Face ID, Touch ID).
*   **Device-Bound Credentials**: Ensures that the authentication factor is physically tied to the user's trusted device.

### 🎮 Tic-Tac-Toe CAPTCHA
*   **AI-Resistant**: A custom game-based CAPTCHA that is easy for humans but difficult for automated bots.
*   **Stage 1.5 Security**: Intercepts the login flow to prevent credential stuffing attacks.

### 📱 Seamless Handoff
*   **Desktop-to-Mobile**: Use a secure QR code to handoff biometric enrollment from a desktop browser to a mobile device's camera/sensor.

---

## 🎨 Design Philosophy: Glassmorphism 2.0
AuthFusion utilizes a unified **Glassmorphic** design system built with Tailwind CSS:
*   **Backdrop Blurs**: Heavy use of `backdrop-blur-xl` for a premium, translucent feel.
*   **Radial Gradients**: Dynamic backgrounds that shift based on system state.
*   **Micro-Animations**: Fluid transitions powered by `framer-motion` for a responsive, "alive" interface.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript |
| **Styling** | Tailwind CSS, Shadcn UI, Lucide Icons |
| **Animations** | Framer Motion, Sonner (Toasts) |
| **State/Data** | TanStack Query, Axios |
| **Biometrics** | face-api.js, WebAuthn API |
| **Database** | Neon PostgreSQL (Serverless) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (Neon recommended)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/AinzAmour/Secure-Login-Hub.git
   cd Secure-Login-Hub
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment**:
   Create a `.env` file in the root:
   ```env
   DATABASE_URL=your_postgresql_url
   SESSION_SECRET=your_long_random_string
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

---

## 🔒 Security Architecture
AuthFusion follows a **Local-First Privacy** model:
1.  **Zero-Knowledge Biometrics**: Face descriptors are processed locally. Only encrypted hashes are stored.
2.  **Session Isolation**: Uses signed cookies (`authfusion.sid`) with `HttpOnly`, `Secure`, and `SameSite: Strict` flags.
3.  **Risk Engine**: Integrated AI-driven risk scoring for every login attempt (powered by Gemini).

---

## 📄 License
This project is licensed under the MIT License. Developed with ❤️ for the HackHustle Hackathon.
