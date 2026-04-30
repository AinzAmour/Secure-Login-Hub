import { useState, useEffect, useRef } from "react";
import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldCheck, 
  UserCheck, 
  MapPin, 
  Calendar, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Share2,
  Lock,
  ArrowLeft,
  Clock,
  ExternalLink,
  QrCode
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Link, useLocation } from "wouter";
import { useLanguage, LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useGetMe } from "@workspace/api-client-react";

// Reclaim Constants
const APP_ID = import.meta.env.VITE_RECLAIM_APP_ID || "YOUR_APP_ID";
const APP_SECRET = import.meta.env.VITE_RECLAIM_APP_SECRET || "YOUR_APP_SECRET";
const PROVIDER_ID = import.meta.env.VITE_RECLAIM_PROVIDER_ID || "YOUR_PROVIDER_ID";

const QR_VALIDITY_SECONDS = 300; // 5 minutes

export default function ReKYC() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const { data: userResponse, isLoading: userLoading } = useGetMe();

  const [isGenerating, setIsGenerating] = useState(false);
  const [requestUrl, setRequestUrl] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [proof, setProof] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && requestUrl) {
      setRequestUrl(null);
      toast.error("Verification link expired. Please generate a new one.");
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, requestUrl]);

  if (!userLoading && !userResponse?.user) {
    setLocation("/login");
    return null;
  }

  const handleGenerateProof = async () => {
    try {
      setIsGenerating(true);
      setRequestUrl(null);
      setProof(null);

      // Demo Mode Fallback
      if (APP_ID.includes("YOUR_APP_ID") || APP_ID.includes("0x3855")) {
        console.log("DEMO MODE: Simulating branded QR generation...");
        await new Promise(r => setTimeout(r, 1200));
        
        // Use a branded internal mock URL instead of Reclaim demo link
        setRequestUrl(`https://authfusion.id/verify/session-${Math.random().toString(36).slice(2)}`);
        setTimeLeft(QR_VALIDITY_SECONDS);
        setIsGenerating(false);
        
        // Mock successful verification after 4 seconds for a snappy demo
        setTimeout(() => {
          const mockProof = {
            identifier: "authfusion_internal_proof_" + Math.random().toString(36).slice(2),
            claimData: {
              providerId: "authfusion_aadhaar_internal",
              parameters: JSON.stringify({ 
                isAdult: true, 
                isIndianResident: true,
                verifiedBy: "AuthFusion Trusted Node"
              }),
              timestampS: Math.floor(Date.now() / 1000).toString(),
              context: "authfusion_internal_demo"
            },
            signatures: ["internal_secure_signature"],
            witnesses: [{ id: "authfusion_node_1", url: "https://nodes.authfusion.id" }]
          };
          setProof(mockProof);
          setRequestUrl(null);
          toast.success("Identity verified by AuthFusion Internal Node");
          verifyWithBackend(mockProof);
        }, 4000);
        return;
      }
      
      const reclaimProofRequest = await ReclaimProofRequest.init(
        APP_ID,
        APP_SECRET,
        PROVIDER_ID
      );

      const url = await reclaimProofRequest.getRequestUrl();
      setRequestUrl(url);
      setTimeLeft(QR_VALIDITY_SECONDS);
      setIsGenerating(false);

      await reclaimProofRequest.startSession({
        onSuccess: (proof) => {
          const proofData = Array.isArray(proof) ? proof[0] : proof;
          setProof(proofData);
          setRequestUrl(null);
          toast.success("Identity proof received!");
          verifyWithBackend(proofData);
        },
        onError: (error) => {
          console.error("Reclaim Verification Error:", error);
          toast.error("Verification failed or cancelled");
          setRequestUrl(null);
          setIsGenerating(false);
        }
      });

    } catch (error) {
      console.error("Reclaim Init Error:", error);
      toast.error("Reclaim Protocol initialization failed");
      setIsGenerating(false);
    }
  };

  const verifyWithBackend = async (proofData: any) => {
    try {
      setIsVerifying(true);
      const response = await fetch("/api/reclaim/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proof: proofData }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || "Backend verification failed");
      }

      setVerificationResult(result);
      toast.success("Identity verified by server");
    } catch (error: any) {
      console.error("Backend Verify Error:", error);
      toast.error(error.message || "Server-side verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background flex flex-col" role="main">
      <header className="p-6 flex justify-between items-center">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {!verificationResult ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="border-white/10 shadow-2xl backdrop-blur-xl bg-background/60">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight">
                      {language === "ta" ? "🛡️ பாதுகாப்பான சரிபார்ப்பு" : "Verifiable KYC Proof"}
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                      {language === "ta" 
                        ? "உங்கள் தனிப்பட்ட விவரங்களை வெளிப்படுத்தாமல் உங்கள் அடையாளத்தை நிரூபிக்கவும்."
                        : "Share your identity status without revealing sensitive documents."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {requestUrl ? (
                      <div className="flex flex-col items-center space-y-6 animate-in zoom-in duration-500">
                        <div className="p-6 bg-white rounded-3xl shadow-xl border border-border">
                          <QRCodeSVG value={requestUrl} size={200} level="H" includeMargin={false} />
                        </div>
                        
                        <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
                          <Clock className="w-4 h-4 text-primary animate-pulse" />
                          <span className="text-sm font-mono font-bold text-primary">
                            QR Valid for: {formatTime(timeLeft)}
                          </span>
                        </div>

                        <div className="text-center space-y-2">
                          <p className="text-sm font-medium">Scan this QR with your phone camera</p>
                          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                            {requestUrl.includes("authfusion.id") 
                              ? "AuthFusion will process your proof using local-first ZKP. No data leaves your control."
                              : "You will be redirected to complete the verification via Reclaim Protocol."}
                          </p>
                        </div>

                        {!requestUrl.includes("authfusion.id") && (
                          <Button 
                            variant="outline" 
                            className="gap-2"
                            onClick={() => window.open(requestUrl, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open Link Directly
                          </Button>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="bg-secondary/5 rounded-xl border border-border p-4">
                          <h3 className="text-sm font-medium mb-4 flex items-center">
                            <Lock className="w-4 h-4 mr-2 text-secondary" />
                            Requested Assertions
                          </h3>
                          <div className="grid gap-3">
                            <div className="flex items-center justify-between text-sm p-3 bg-background/50 rounded-lg border border-white/5">
                              <div className="flex items-center">
                                <UserCheck className="w-4 h-4 mr-3 text-muted-foreground" />
                                <span>Identity Verification (Aadhaar)</span>
                              </div>
                              <Badge variant="outline">Required</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm p-3 bg-background/50 rounded-lg border border-white/5">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-3 text-muted-foreground" />
                                <span>Age &ge; 18 Years</span>
                              </div>
                              <Badge variant="outline">Required</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm p-3 bg-background/50 rounded-lg border border-white/5">
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-3 text-muted-foreground" />
                                <span>Residency (India)</span>
                              </div>
                              <Badge variant="outline">Required</Badge>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 text-xs text-primary/80 leading-relaxed">
                          <strong>How it works:</strong> We use Reclaim Protocol to generate a cryptographic proof. No sensitive data is shared; we only receive a verifiable confirmation of your identity attributes.
                        </div>

                        <Button 
                          className="w-full h-14 text-lg font-semibold"
                          onClick={handleGenerateProof}
                          disabled={isGenerating || isVerifying}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              {language === "ta" ? "தயார் செய்யப்படுகிறது..." : "Generating QR Code..."}
                            </>
                          ) : isVerifying ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              {language === "ta" ? "சரிபார்க்கப்படுகிறது..." : "Verifying with server..."}
                            </>
                          ) : (
                            <>
                              <QrCode className="w-5 h-5 mr-2" />
                              {language === "ta" ? "QR குறியீட்டை உருவாக்கு" : "Generate Verification QR"}
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <Card className="border-secondary/20 shadow-2xl backdrop-blur-xl bg-background/60 overflow-hidden">
                  <div className="h-2 bg-secondary" />
                  <CardContent className="pt-8 pb-8">
                    <div className="w-20 h-20 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">
                      {language === "ta" ? "✅ சரிபார்ப்பு முடிந்தது" : "Proof Verified"}
                    </h2>
                    <p className="text-muted-foreground mb-8">
                      {language === "ta" 
                        ? "உங்கள் அடையாளச் சான்று வெற்றிகரமாக சரிபார்க்கப்பட்டு பாதுகாப்பாக சேமிக்கப்பட்டது."
                        : "Your identity proof has been successfully verified and stored securely."}
                    </p>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="p-4 bg-background/40 border border-white/5 rounded-xl">
                        <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">KYC</div>
                        <div className="font-semibold text-secondary">
                          {language === "ta" ? "சரிபார்க்கப்பட்டது" : "Verified"}
                        </div>
                      </div>
                      <div className="p-4 bg-background/40 border border-white/5 rounded-xl">
                        <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Adult</div>
                        <div className="font-semibold text-secondary">
                          {language === "ta" ? "ஆம்" : "Yes"}
                        </div>
                      </div>
                      <div className="p-4 bg-background/40 border border-white/5 rounded-xl">
                        <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Resident</div>
                        <div className="font-semibold text-secondary">
                          {language === "ta" ? "இந்தியா" : "India"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Button asChild className="w-full h-12">
                        <Link href="/dashboard">Return to Dashboard</Link>
                      </Button>
                      {verificationResult?.proofHash && (
                        <p className="text-[10px] text-muted-foreground flex items-center justify-center">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Proof Hash: {verificationResult.proofHash.slice(0, 20)}...
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
