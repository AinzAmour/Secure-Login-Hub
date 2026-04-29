import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}

export function Logo({ className, iconClassName, textClassName }: LogoProps = {}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Shield className={cn("h-6 w-6 text-primary", iconClassName)} />
      <span className={cn("font-bold tracking-tight text-xl text-primary", textClassName)}>
        Sentinel
      </span>
    </div>
  );
}
