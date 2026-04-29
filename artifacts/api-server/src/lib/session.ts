import type { Request, Response, NextFunction } from "express";

export interface SessionPayload {
  userId?: string;
  webauthnRegisterChallenge?: string;
}

export function getSession(req: Request): SessionPayload {
  // cookie-session attaches to req.session
  const session = (req as unknown as { session?: SessionPayload }).session;
  if (!session) {
    throw new Error("Session middleware not initialized");
  }
  return session;
}

export function setSessionUser(req: Request, userId: string): void {
  const session = getSession(req);
  session.userId = userId;
}

export function clearSession(req: Request): void {
  (req as unknown as { session: null }).session = null;
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const session = getSession(req);
  if (!session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}
