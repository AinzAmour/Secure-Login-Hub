import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint, Loader2 } from "lucide-react";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

interface BiometricButtonProps {
  mode: "enroll" | "auth";
  onSuccess: () => void;
  optionsMutation: any;
  verifyMutation: any;
  challengeToken?: string;
  className?: string;
  children?: React.ReactNode;
}

export function BiometricButton({ 
  mode, 
  onSuccess, 
  optionsMutation, 
  verifyMutation, 
  challengeToken,
  className,
  children 
}: BiometricButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBiometric = async () => {
    setIsPending(true);
    setError(null);
    try {
      if (mode === "enroll") {
        const options = await optionsMutation.mutateAsync();
        const attestation = await startRegistration({ optionsJSON: options as any });
        await verifyMutation.mutateAsync({ data: { attestation } });
      } else {
        const options = await optionsMutation.mutateAsync({ data: { challengeToken } });
        const assertion = await startAuthentication({ optionsJSON: options as any });
        await verifyMutation.mutateAsync({ data: { challengeToken, assertion } });
      }
      onSuccess();
    } catch (err: any) {
      console.error(`Biometric ${mode} failed`, err);
      setError(err.message || "Biometric interaction failed");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className={className}>
      <Button 
        type="button" 
        onClick={handleBiometric} 
        disabled={isPending}
        className="w-full h-14 text-base"
        variant={mode === "auth" ? "outline" : "default"}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <Fingerprint className="mr-2 h-5 w-5" />
        )}
        {children || (mode === "enroll" ? "Enroll Biometric" : "Continue with Biometric")}
      </Button>
      {error && (
        <p className="text-destructive text-sm mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
