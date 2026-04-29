import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";
import { ProgressSteps } from "@/components/ProgressSteps";
import { FaceCapture } from "@/components/FaceCapture";
import { BiometricButton } from "@/components/BiometricButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { ShieldCheck, Loader2, ArrowRight, Mail, Copy, Fingerprint, CheckCircle2, Smartphone, Monitor } from "lucide-react";
import { formatAadhaar, unformatAadhaar } from "@/lib/formatAadhaar";
import { HandoffQR } from "@/components/HandoffQR";

import {
  useRegisterStart,
  useRegisterVerifyOtp,
  useRegisterComplete,
  useEnrollFace,
  useWebauthnRegisterOptions,
  useWebauthnRegisterVerify,
  getGetMeQueryKey,
  getGetSecurityStatusQueryKey,
  getGetRecentActivityQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const STEPS = ["Email", "OTP", "Identity", "Face", "Biometric", "Complete"];

export default function Register() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);

  // State
  const [email, setEmail] = useState("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  
  const [fullName, setFullName] = useState("");
  const [aadhaarDisplay, setAadhaarDisplay] = useState("");
  const [mpin, setMpin] = useState("");
  const [confirmMpin, setConfirmMpin] = useState("");

  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [faceMode, setFaceMode] = useState<"device" | "phone">("device");
  const [bioMode, setBioMode] = useState<"device" | "phone">("device");

  // Mutations
  const registerStart = useRegisterStart();
  const verifyOtp = useRegisterVerifyOtp();
  const registerComplete = useRegisterComplete();
  const enrollFace = useEnrollFace();
  const webauthnOptions = useWebauthnRegisterOptions();
  const webauthnVerify = useWebauthnRegisterVerify();

  // Step Handlers
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    try {
      const res = await registerStart.mutateAsync({ data: { email } });
      if (res.demoOtp) setDemoOtp(res.demoOtp);
      setCurrentStep(1);
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    }
  };

  const handleResendOtp = async () => {
    try {
      const res = await registerStart.mutateAsync({ data: { email } });
      if (res.demoOtp) setDemoOtp(res.demoOtp);
      toast.success("OTP resent");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend OTP");
    }
  };

  useEffect(() => {
    if (currentStep === 1 && otp.length === 6) {
      verifyOtp.mutateAsync({ data: { email, otp } })
        .then((res) => {
          setRegistrationToken(res.registrationToken);
          setCurrentStep(2);
        })
        .catch((err) => {
          toast.error(err.message || "Invalid OTP");
          setOtp("");
        });
    }
  }, [otp, currentStep]);

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawAadhaar = unformatAadhaar(aadhaarDisplay);
    if (fullName.length < 2) {
      toast.error("Name is too short");
      return;
    }
    if (rawAadhaar.length !== 12) {
      toast.error("Aadhaar must be 12 digits");
      return;
    }
    if (mpin.length !== 6) {
      toast.error("MPIN must be 6 digits");
      return;
    }
    if (mpin !== confirmMpin) {
      toast.error("MPINs do not match");
      return;
    }

    try {
      await registerComplete.mutateAsync({
        data: {
          registrationToken,
          fullName,
          aadhaarNumber: rawAadhaar,
          mpin
        }
      });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setCurrentStep(3);
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    }
  };

  const handleFaceComplete = async (descriptor: number[]) => {
    try {
      await enrollFace.mutateAsync({ data: { faceDescriptor: descriptor } });
      setFaceEnrolled(true);
      setTimeout(() => setCurrentStep(4), 1500);
    } catch (err: any) {
      toast.error(err.message || "Face enrollment failed");
    }
  };

  const finishRegistration = () => {
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSecurityStatusQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
    setLocation("/dashboard");
  };

  useEffect(() => {
    if (currentStep === 5) {
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    }
  }, [currentStep, queryClient]);

  const variants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-muted/30">
      <header className="p-6">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <ProgressSteps steps={STEPS} currentStep={currentStep} className="mb-12" />

        <div className="w-full max-w-md relative">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div key="step0" variants={variants} initial="initial" animate="animate" exit="exit">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-semibold tracking-tight">Create your vault</h2>
                      <p className="text-sm text-muted-foreground mt-2">Enter your email to begin setup.</p>
                    </div>
                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="name@example.com" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoFocus
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={registerStart.isPending}>
                        {registerStart.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Continue
                      </Button>
                    </form>
                    <div className="text-center mt-6 text-sm">
                      <span className="text-muted-foreground">Already have an account? </span>
                      <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div key="step1" variants={variants} initial="initial" animate="animate" exit="exit">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center mb-6 flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Mail className="w-6 h-6 text-primary" />
                      </div>
                      <h2 className="text-2xl font-semibold tracking-tight">Check your email</h2>
                      <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                        We've sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
                      </p>
                    </div>
                    
                    {demoOtp && (
                      <div className="mb-6 p-3 bg-secondary/10 border border-secondary/20 rounded-lg flex items-center justify-between">
                        <span className="text-sm text-secondary font-medium">Demo OTP: {demoOtp}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-secondary hover:text-secondary hover:bg-secondary/20" onClick={() => {
                          navigator.clipboard.writeText(demoOtp);
                          toast.success("Copied to clipboard");
                        }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <div className="flex flex-col items-center space-y-6">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={verifyOtp.isPending}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>

                      {verifyOtp.isPending && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...
                        </div>
                      )}

                      <button 
                        type="button" 
                        onClick={handleResendOtp}
                        disabled={registerStart.isPending}
                        className="text-sm text-primary hover:underline font-medium"
                      >
                        Resend code
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div key="step2" variants={variants} initial="initial" animate="animate" exit="exit">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-semibold tracking-tight">Identity Details</h2>
                      <p className="text-sm text-muted-foreground mt-2">Secure your vault with your identity and a PIN.</p>
                    </div>
                    <form onSubmit={handleIdentitySubmit} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input 
                          id="fullName" 
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="As per Aadhaar"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="aadhaar">Aadhaar Number</Label>
                        <Input 
                          id="aadhaar" 
                          value={aadhaarDisplay}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 12);
                            setAadhaarDisplay(formatAadhaar(val));
                          }}
                          placeholder="XXXX XXXX XXXX"
                          required
                        />
                        <p className="text-[10px] text-muted-foreground flex items-center">
                          <ShieldCheck className="w-3 h-3 mr-1 text-secondary" />
                          Encrypted with AES-256 at rest
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 flex flex-col">
                          <Label>6-Digit MPIN</Label>
                          <InputOTP maxLength={6} value={mpin} onChange={setMpin} className="w-full flex justify-between">
                            <InputOTPGroup className="w-full flex justify-between">
                              {[0,1,2,3,4,5].map(i => (
                                <InputOTPSlot key={i} index={i} className="w-full" style={{ WebkitTextSecurity: "disc" } as React.CSSProperties} />
                              ))}
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                        <div className="space-y-2 flex flex-col">
                          <Label>Confirm MPIN</Label>
                          <InputOTP maxLength={6} value={confirmMpin} onChange={setConfirmMpin} className="w-full flex justify-between">
                            <InputOTPGroup className="w-full flex justify-between">
                              {[0,1,2,3,4,5].map(i => (
                                <InputOTPSlot key={i} index={i} className="w-full" style={{ WebkitTextSecurity: "disc" } as React.CSSProperties} />
                              ))}
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </div>

                      <Button type="submit" className="w-full mt-6" disabled={registerComplete.isPending}>
                        {registerComplete.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Secure My Vault
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div key="step3" variants={variants} initial="initial" animate="animate" exit="exit">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-semibold tracking-tight">Enroll Face ID</h2>
                      <p className="text-sm text-muted-foreground mt-2">Used as an extra factor to access your vault. No images leave your device.</p>
                    </div>

                    <DeviceModeTabs value={faceMode} onChange={setFaceMode} className="mb-5" />

                    {faceMode === "device" ? (
                      <div className="max-w-[280px] mx-auto mb-6">
                        <FaceCapture onDescriptor={handleFaceComplete} mode="enroll" className="aspect-square" />
                      </div>
                    ) : (
                      <div className="mb-6">
                        <HandoffQR
                          purpose="register_face"
                          onComplete={() => {
                            setFaceEnrolled(true);
                            toast.success("Face enrolled from your phone");
                            queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
                            queryClient.invalidateQueries({ queryKey: getGetSecurityStatusQueryKey() });
                            setTimeout(() => setCurrentStep(4), 1200);
                          }}
                        />
                      </div>
                    )}

                    <div className="flex justify-center">
                      <Button variant="ghost" onClick={() => setCurrentStep(4)} className="text-muted-foreground">
                        Skip for now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div key="step4" variants={variants} initial="initial" animate="animate" exit="exit">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                      <Fingerprint className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight mb-2">Device Biometrics</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Add a fingerprint or Face ID factor — from this device, or by scanning a QR with your phone.
                    </p>

                    {biometricEnrolled ? (
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
                        <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
                        <p className="font-medium">Device enrolled</p>
                      </div>
                    ) : (
                      <>
                        <DeviceModeTabs value={bioMode} onChange={setBioMode} className="mb-5 text-left" />
                        {bioMode === "device" ? (
                          <BiometricButton
                            mode="enroll"
                            optionsMutation={webauthnOptions}
                            verifyMutation={webauthnVerify}
                            onSuccess={() => {
                              setBiometricEnrolled(true);
                              toast.success("Biometric enrolled securely");
                              setTimeout(() => setCurrentStep(5), 1000);
                            }}
                            className="mb-4"
                          />
                        ) : (
                          <div className="mb-4 text-left">
                            <HandoffQR
                              purpose="register_biometric"
                              onComplete={() => {
                                setBiometricEnrolled(true);
                                toast.success("Phone biometric enrolled");
                                queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
                                queryClient.invalidateQueries({ queryKey: getGetSecurityStatusQueryKey() });
                                setTimeout(() => setCurrentStep(5), 1200);
                              }}
                            />
                          </div>
                        )}
                      </>
                    )}

                    <Button variant="ghost" onClick={() => setCurrentStep(5)} className="text-muted-foreground w-full">
                      {biometricEnrolled ? "Continue" : "Skip for now"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 5 && (
              <motion.div key="step5" variants={variants} initial="initial" animate="animate" exit="exit">
                <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
                  <CardContent className="pt-8 pb-8 text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                      <ShieldCheck className="w-10 h-10 text-primary-foreground" />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight mb-2">Vault Secured</h2>
                    <p className="text-muted-foreground mb-8">Your identity data is now protected by Sentinel.</p>

                    <div className="w-full bg-card border rounded-xl p-4 mb-8 text-left space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Email Verified</span>
                        <CheckCircle2 className="w-4 h-4 text-secondary" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">MPIN Set</span>
                        <CheckCircle2 className="w-4 h-4 text-secondary" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Face Enrolled</span>
                        {faceEnrolled ? <CheckCircle2 className="w-4 h-4 text-secondary" /> : <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Biometric Device</span>
                        {biometricEnrolled ? <CheckCircle2 className="w-4 h-4 text-secondary" /> : <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </div>

                    <Button size="lg" className="w-full text-base group" onClick={finishRegistration}>
                      Open Dashboard
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
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

function DeviceModeTabs({
  value,
  onChange,
  className,
}: {
  value: "device" | "phone";
  onChange: (v: "device" | "phone") => void;
  className?: string;
}) {
  return (
    <div className={`flex p-1 bg-muted/60 rounded-lg ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => onChange("device")}
        className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-md transition-colors ${
          value === "device" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
        data-testid="tab-device"
      >
        <Monitor className="w-3.5 h-3.5" />
        This device
      </button>
      <button
        type="button"
        onClick={() => onChange("phone")}
        className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-md transition-colors ${
          value === "phone" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
        data-testid="tab-phone"
      >
        <Smartphone className="w-3.5 h-3.5" />
        Use my phone
      </button>
    </div>
  );
}
