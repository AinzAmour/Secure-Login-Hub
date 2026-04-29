import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { 
  ShieldCheck, LogOut, Eye, EyeOff, AlertTriangle, ShieldAlert,
  Clock, CheckCircle2, User as UserIcon, Calendar, Fingerprint, ScanFace
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FaceCapture } from "@/components/FaceCapture";
import { BiometricButton } from "@/components/BiometricButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import {
  useGetMe,
  useGetSecurityStatus,
  useGetRecentActivity,
  useLogout,
  useEnrollFace,
  useWebauthnRegisterOptions,
  useWebauthnRegisterVerify,
  getGetMeQueryKey,
  getGetSecurityStatusQueryKey,
  getGetRecentActivityQueryKey
} from "@workspace/api-client-react";
import { humanizeActivity } from "@/lib/humanizeActivity";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [enrollModal, setEnrollModal] = useState<"face" | "biometric" | null>(null);

  const { data: userResponse, isLoading: userLoading } = useGetMe();
  const { data: security, isLoading: securityLoading } = useGetSecurityStatus();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();
  
  const logout = useLogout();
  const enrollFace = useEnrollFace();
  const webauthnOptions = useWebauthnRegisterOptions();
  const webauthnVerify = useWebauthnRegisterVerify();

  const user = userResponse?.user;

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } catch (err) {
      toast.error("Failed to sign out");
    }
  };

  const handleFaceEnrolled = async (descriptor: number[]) => {
    try {
      await enrollFace.mutateAsync({ data: { faceDescriptor: descriptor } });
      toast.success("Face enrolled successfully");
      queryClient.invalidateQueries({ queryKey: getGetSecurityStatusQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
      setEnrollModal(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to enroll face");
    }
  };

  const onBiometricSuccess = () => {
    toast.success("Biometric enrolled successfully");
    queryClient.invalidateQueries({ queryKey: getGetSecurityStatusQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
    setEnrollModal(null);
  };

  if (userLoading || securityLoading) {
    return (
      <div className="min-h-[100dvh] bg-muted/20 flex flex-col">
        <header className="border-b bg-background"><div className="h-16 flex items-center px-4"><Logo /></div></header>
        <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-64 col-span-2 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || !security) return null; // Handled by App.tsx redirect

  const firstName = user.fullName.split(" ")[0];
  const isFullySecured = security.faceEnrolled && security.biometricEnrolled;

  return (
    <div className="min-h-[100dvh] bg-muted/20 pb-20">
      <header className="border-b bg-background sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">{user.fullName}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} disabled={logout.isPending}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-8 max-w-5xl space-y-8">
        
        {/* Hero Banner */}
        <section className="bg-primary text-primary-foreground rounded-2xl p-8 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <ShieldCheck className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back, {firstName}</h1>
            <div className="flex items-center gap-2 text-primary-foreground/80 mb-6">
              <span className="font-mono bg-primary-foreground/10 px-3 py-1 rounded-md tracking-widest text-sm">
                {showAadhaar ? "XXXX XXXX " + user.aadhaarMasked.slice(-4) : "XXXX XXXX XXXX"}
              </span>
              <button 
                onClick={() => setShowAadhaar(!showAadhaar)}
                className="p-1.5 hover:bg-primary-foreground/10 rounded-md transition-colors"
              >
                {showAadhaar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            {security.lastLoginAt && (
              <p className="text-sm text-primary-foreground/60 flex items-center">
                <Clock className="w-4 h-4 mr-1.5" />
                Last sign-in {formatDistanceToNow(new Date(security.lastLoginAt))} ago
              </p>
            )}
          </div>
        </section>

        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Security Status */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-secondary" />
                  Security Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Email Verified</p>
                      <p className="text-xs text-muted-foreground">{security.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
                    <div>
                      <p className="text-sm font-medium">MPIN Active</p>
                      <p className="text-xs text-muted-foreground">Used for fallback access</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${security.faceEnrolled ? 'bg-card' : 'bg-destructive/5 border-destructive/20'}`}>
                    {security.faceEnrolled ? (
                      <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium">Face Enrolled</p>
                      <p className="text-xs text-muted-foreground">
                        {security.faceEnrolled ? "Active" : "Action required"}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${security.biometricEnrolled ? 'bg-card' : 'bg-destructive/5 border-destructive/20'}`}>
                    {security.biometricEnrolled ? (
                      <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium">Device Biometrics</p>
                      <p className="text-xs text-muted-foreground">
                        {security.biometricEnrolled ? `${security.biometricCount} device(s)` : "Action required"}
                      </p>
                    </div>
                  </div>
                </div>

                {!isFullySecured && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-amber-900 dark:text-amber-500 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" />
                        Strengthen your security
                      </h4>
                      <p className="text-sm text-amber-700 dark:text-amber-600 mt-1">
                        Enroll missing factors to ensure maximum protection of your vault.
                      </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      {!security.faceEnrolled && (
                        <Button variant="outline" size="sm" className="bg-white hover:bg-amber-50 dark:bg-background" onClick={() => setEnrollModal("face")}>
                          Enroll Face
                        </Button>
                      )}
                      {!security.biometricEnrolled && (
                        <Button variant="outline" size="sm" className="bg-white hover:bg-amber-50 dark:bg-background" onClick={() => setEnrollModal("biometric")}>
                          Add Device
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profile Info */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-primary" />
                  Account Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 py-3 border-b">
                    <span className="text-sm text-muted-foreground">Full Name</span>
                    <span className="text-sm font-medium col-span-2">{user.fullName}</span>
                  </div>
                  <div className="grid grid-cols-3 py-3 border-b">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-sm font-medium col-span-2">{user.email}</span>
                  </div>
                  <div className="grid grid-cols-3 py-3 border-b">
                    <span className="text-sm text-muted-foreground">Aadhaar</span>
                    <span className="text-sm font-medium col-span-2 font-mono">XXXX XXXX {user.aadhaarMasked.slice(-4)}</span>
                  </div>
                  <div className="grid grid-cols-3 py-3">
                    <span className="text-sm text-muted-foreground">Member Since</span>
                    <span className="text-sm font-medium col-span-2 flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                      {new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Timeline */}
          <div className="md:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {activityLoading ? (
                  <div className="space-y-4">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : activity && activity.length > 0 ? (
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                    {activity.slice(0, 10).map((event, i) => (
                      <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${event.success ? 'bg-secondary' : 'bg-destructive'}`}>
                          {/* dot */}
                        </div>
                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] pl-3 md:pl-0">
                          <div className="flex flex-col bg-card p-3 rounded-lg border shadow-xs group-hover:shadow-sm transition-all">
                            <span className="text-sm font-medium">{humanizeActivity(event)}</span>
                            <span className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(event.createdAt))} ago
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No recent activity.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Enrollment Modals */}
      <Dialog open={enrollModal !== null} onOpenChange={(o) => !o && setEnrollModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {enrollModal === "face" ? "Enroll Face ID" : "Enroll Biometric Device"}
            </DialogTitle>
            <DialogDescription>
              {enrollModal === "face" 
                ? "Scan your face to add it as a secure authentication factor."
                : "Register this device's fingerprint or face scanner."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {enrollModal === "face" && (
              <div className="max-w-[260px] mx-auto">
                <FaceCapture onDescriptor={handleFaceEnrolled} mode="enroll" className="aspect-square" />
              </div>
            )}
            
            {enrollModal === "biometric" && (
              <div className="text-center space-y-6 pt-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Fingerprint className="w-8 h-8 text-primary" />
                </div>
                <BiometricButton 
                  mode="enroll"
                  optionsMutation={webauthnOptions}
                  verifyMutation={webauthnVerify}
                  onSuccess={onBiometricSuccess}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
