import type { Request } from "express";

export function getRpInfo(req: Request): { rpId: string; origin: string } {
  // The RP ID must match the effective domain. Use the request host.
  const host = (req.get("host") ?? "localhost").split(":")[0]!;
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0] ??
    req.protocol ??
    "http";
  const portPart = req.get("host")?.includes(":")
    ? `:${req.get("host")!.split(":")[1]}`
    : "";
  const origin = `${proto}://${host}${portPart}`;
  return { rpId: host, origin };
}
