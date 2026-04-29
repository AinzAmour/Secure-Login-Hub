import type { User, WebauthnCredential } from "@workspace/db";

export function serializeUser(
  user: User,
  webauthnCount: number,
): {
  id: string;
  email: string;
  fullName: string;
  aadhaarMasked: string;
  hasFaceEnrolled: boolean;
  hasBiometricEnrolled: boolean;
  createdAt: string;
} {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    aadhaarMasked: `XXXX XXXX ${user.aadhaarLast4}`,
    hasFaceEnrolled: Array.isArray(user.faceDescriptor) && user.faceDescriptor.length > 0,
    hasBiometricEnrolled: webauthnCount > 0,
    createdAt: user.createdAt.toISOString(),
  };
}

export function countCredentials(creds: WebauthnCredential[]): number {
  return creds.length;
}
