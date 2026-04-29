import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";
import { FaceCapture } from "@/components/FaceCapture";
import { BiometricButton } from "@/components/BiometricButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Loader2, Fingerprint, ScanFace, ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import {
  useLoginLookup,
  useLoginFace,
  useLoginWebauthnOptions,
  useLoginWebauthnVerify,
  getGetMeQueryKey,
  LoginChallengeResponse
} from "@workspace/api-client-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [stage, setStage] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [mpin, setMpin] = useState("");
  
  const [challengeData, setChallengeData] = useState<LoginChallengeResponse | null>(null);
  const [selectedFactor, setSelectedFactor] = useState<"biometric" | "face" | null>(null);

  const lookup = useLoginLookup();
  const loginFace = useLoginFace();
  const webauthnOptions = useLoginWebauthnOptions();
  const webauthnVerify = useLoginWebauthnVerify();

  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Email required");
      return;
    }
    if (mpin.length !== 6) {
      toast.error("MPIN must be 6 digits");
      return;
    }

    try {
      const res = await lookup.mutateAsync({ data: { email, mpin } });
      setChallengeData(res);
      setStage(2);
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
      setMpin("");
    }
  };

  const handleFaceSuccess = async (descriptor: number[]) => {
    if (!challengeData) return;
    try {
      await loginFace.mutateAsync({ 
        data: { 
          challengeToken: challengeData.challengeToken, 
          faceDescriptor: descriptor 
        } 
      });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setLocation("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Face verification failed");
      setSelectedFactor(null);
    }
  };

  const handleBiometricSuccess = () => {
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    setLocation("/dashboard");
  };

  const variants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-muted/30">
      <header className="p-6 flex justify-center md:justify-start">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md relative">
          <AnimatePresence mode="wait">
            {stage === 1 && (
              <motion.div key="stage1" variants={variants} initial="initial" animate="animate" exit="exit">
                <Card className="border shadow-lg">
                  <CardContent className="pt-8 pb-8">
                    <div className="text-center mb-8">
                      <h1 className="text-2xl font-semibold tracking-tight">Sign in to Sentinel</h1>
                      <p className="text-sm text-muted-foreground mt-2">Enter your email and MPIN to continue.</p>
                    </div>

                    <form onSubmit={handleLookupSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="name@example.com" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2 flex flex-col items-center">
                        <Label className="self-start">6-Digit MPIN</Label>
                        <InputOTP maxLength={6} value={mpin} onChange={setMpin} disabled={lookup.isPending}>
                          <InputOTPGroup>
                            <InputOTPSlot index={0} style={{ WebkitTextSecurity: "disc" } as React.CSSProperties} />
                            <InputOTPSlot index={1} style={{ WebkitTextSecurity: "disc" } as React.CSSProperties} />
                            <InputOTPSlot index={2} style={{ WebkitTextSecurity: "disc" } as React.CSSProperties} />
                            <InputOTPSlot index={3} style={{ WebkitTextSecurity: "disc" } as React.CSSProperties} />
                            <InputOTPSlot index={4} style={{ WebkitTextSecurity: "disc" } as React.CSSProperties} />
                            <InputOTPSlot index={5} style={{ WebkitTextSecurity: "disc" } as React.CSSProperties} />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>

                      <Button type="submit" className="w-full h-11" disabled={lookup.isPending}>
                        {lookup.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Continue securely
                      </Button>
                    </form>

                    <div className="text-center mt-8 text-sm">
                      <span className="text-muted-foreground">New to Sentinel? </span>
                      <Link href="/register" className="text-primary hover:underline font-medium">Create vault</Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {stage === 2 && challengeData && (
              <motion.div key="stage2" variants={variants} initial="initial" animate="animate" exit="exit">
                <Card className="border shadow-lg">
                  <CardContent className="pt-8 pb-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 text-2xl font-semibold uppercase">
                      {challengeData.userHint.fullName.charAt(0)}
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight mb-2">
                      Welcome back, {challengeData.userHint.fullName.split(' ')[0]}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-8">
                      Verify your identity to unlock your vault.
                    </p>

                    <div className="space-y-4">
                      {selectedFactor === "face" ? (
                        <div className="animate-in fade-in zoom-in duration-300">
                          <FaceCapture onDescriptor={handleFaceSuccess} mode="auth" className="w-full max-w-[240px] mx-auto aspect-square mb-4" />
                          <Button variant="ghost" onClick={() => setSelectedFactor(null)} className="text-muted-foreground">
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          {challengeData.availableFactors.includes("biometric") && (
                            <BiometricButton 
                              mode="auth"
                              challengeToken={challengeData.challengeToken}
                              optionsMutation={webauthnOptions}
                              verifyMutation={webauthnVerify}
                              onSuccess={handleBiometricSuccess}
                            />
                          )}
                          
                          {challengeData.availableFactors.includes("face") && (
                            <Button 
                              variant="outline" 
                              className="w-full h-14 text-base"
                              onClick={() => setSelectedFactor("face")}
                            >
                              <ScanFace className="mr-2 h-5 w-5" />
                              Continue with Face ID
                            </Button>
                          )}
                          
                          {challengeData.availableFactors.length === 0 && (
                            <div className="p-4 bg-amber-50 text-amber-900 rounded-lg text-sm">
                              No second factors enrolled. Please contact support.
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="mt-8 pt-6 border-t flex justify-center">
                      <button 
                        onClick={() => {
                          setStage(1);
                          setMpin("");
                          setSelectedFactor(null);
                        }}
                        className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to email
                      </button>
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
