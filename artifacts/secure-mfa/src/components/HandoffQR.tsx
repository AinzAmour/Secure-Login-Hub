import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Smartphone, CheckCircle2, XCircle, RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useHandoffCreate,
  useHandoffPoll,
  useHandoffConsume,
} from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { motion } from "framer-motion";

export type HandoffPurpose =
  | "register_face"
  | "register_biometric"
  | "login_face"
  | "login_biometric";

interface HandoffQRProps {
  purpose: HandoffPurpose;
  challengeToken?: string;
  onComplete: (result: { user?: User | null }) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
}

type Phase = "idle" | "loading" | "ready" | "completed" | "failed" | "expired";

export function HandoffQR({
  purpose,
  challengeToken,
  onComplete,
  onCancel,
  title,
  subtitle,
}: HandoffQRProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [handoffId, setHandoffId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [mobileUrl, setMobileUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [copied, setCopied] = useState(false);
  const startedRef = useRef(false);

  const createHandoff = useHandoffCreate();
  const pollHandoff = useHandoffPoll();
  const consumeHandoff = useHandoffConsume();

  const start = async () => {
    setPhase("loading");
    setErrorMessage(null);
    try {
      const res = await createHandoff.mutateAsync({
        data: { purpose, ...(challengeToken ? { challengeToken } : {}) },
      });
      setHandoffId(res.handoffId);
      setToken(res.token);
      setMobileUrl(res.mobileUrl);
      setSecondsLeft(res.expiresInSeconds);
      setPhase("ready");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not create handoff";
      setErrorMessage(msg);
      setPhase("failed");
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown
  useEffect(() => {
    if (phase !== "ready") return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          setPhase("expired");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // Polling loop
  useEffect(() => {
    if (phase !== "ready" || !handoffId || !token) return;
    let cancelled = false;
    const poll = async () => {
      while (!cancelled) {
        try {
          const status = await pollHandoff.mutateAsync({
            data: { handoffId, token },
          });
          if (cancelled) return;
          if (status.status === "completed") {
            try {
              const consumed = await consumeHandoff.mutateAsync({
                data: { handoffId, token },
              });
              if (cancelled) return;
              setPhase("completed");
              onComplete({ user: consumed.user ?? null });
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Could not finalize";
              setErrorMessage(msg);
              setPhase("failed");
            }
            return;
          }
          if (status.status === "failed") {
            setErrorMessage(status.errorMessage ?? "Verification failed on phone");
            setPhase("failed");
            return;
          }
          if (status.status === "expired") {
            setPhase("expired");
            return;
          }
        } catch {
          // network blip; continue
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    };
    void poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, handoffId, token]);

  const copy = async () => {
    if (!mobileUrl) return;
    try {
      await navigator.clipboard.writeText(mobileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const restart = () => {
    startedRef.current = false;
    setHandoffId(null);
    setToken(null);
    setMobileUrl(null);
    setSecondsLeft(300);
    setPhase("idle");
    startedRef.current = true;
    void start();
  };

  const headerTitle =
    title ??
    (purpose.startsWith("register_")
      ? purpose === "register_face"
        ? "Enroll face on your phone"
        : "Enroll biometric on your phone"
      : purpose === "login_face"
        ? "Verify with your phone's camera"
        : "Verify with your phone's biometric");

  const headerSubtitle =
    subtitle ??
    "Scan the code with your phone camera. We'll wait here while you complete it on the other device.";

  return (
    <Card className="border shadow-sm" data-testid="card-handoff-qr">
      <CardContent className="p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold tracking-tight">{headerTitle}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{headerSubtitle}</p>
          </div>
        </div>

        {phase === "loading" && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-sm">Generating secure code…</p>
          </div>
        )}

        {phase === "ready" && mobileUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <div className="relative p-4 bg-white rounded-xl border" data-testid="qr-frame">
              <QRCodeSVG
                value={mobileUrl}
                size={208}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#0a1530"
              />
              <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl" />
              <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr" />
              <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br" />
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>
                Waiting for phone… expires in{" "}
                <span className="font-mono tabular-nums text-foreground/80">
                  {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                </span>
              </span>
            </div>

            <div className="w-full mt-5 pt-5 border-t">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                Or open this link on your phone
              </p>
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 text-xs px-3 py-2 rounded-md bg-muted/50 border truncate"
                  data-testid="text-mobile-url"
                >
                  {mobileUrl}
                </code>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={copy}
                  data-testid="button-copy-link"
                >
                  {copied ? <Check className="w-4 h-4 text-secondary" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {phase === "completed" && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <p className="font-medium">Verified on your phone</p>
            <p className="text-xs text-muted-foreground mt-1">Continuing…</p>
          </div>
        )}

        {(phase === "failed" || phase === "expired") && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
            <p className="font-medium">
              {phase === "expired" ? "Code expired" : "Phone verification failed"}
            </p>
            {errorMessage && (
              <p className="text-xs text-muted-foreground mt-1">{errorMessage}</p>
            )}
            <div className="flex gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={restart}
                data-testid="button-retry-handoff"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Generate new code
              </Button>
              {onCancel && (
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {onCancel && phase === "ready" && (
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-muted-foreground hover:text-foreground"
              data-testid="button-cancel-handoff"
            >
              Cancel
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
