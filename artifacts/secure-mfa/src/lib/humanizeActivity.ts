export function humanizeActivity(event: { kind: string; method?: string | null }): string {
  const methodMap: Record<string, string> = {
    mpin: "MPIN",
    face: "Face ID",
    biometric: "Biometric",
    otp: "Email OTP",
  };

  const methodText = event.method && methodMap[event.method] ? ` via ${methodMap[event.method]}` : "";

  switch (event.kind) {
    case "login_success":
      return `Signed in${methodText}`;
    case "login_failed":
      return `Failed sign-in attempt${methodText}`;
    case "register":
      return "Account created";
    case "enroll_face":
      return "Face enrolled";
    case "enroll_biometric":
      return "Biometric enrolled";
    case "logout":
      return "Signed out";
    default:
      return event.kind.replace(/_/g, " ");
  }
}
