import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ProgressStepsProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function ProgressSteps({ steps, currentStep, className }: ProgressStepsProps) {
  return (
    <div className={cn("w-full max-w-3xl mx-auto", className)}>
      <div className="relative flex items-center justify-between">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-muted" />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-primary transition-all duration-500 ease-in-out" 
          style={{ width: `${(Math.max(0, currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
        
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <div key={step} className="relative z-10 flex flex-col items-center justify-center gap-2">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: isCompleted || isCurrent ? "hsl(var(--primary))" : "hsl(var(--muted))",
                  borderColor: isCompleted || isCurrent ? "hsl(var(--primary))" : "hsl(var(--muted))",
                  color: isCompleted || isCurrent ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))"
                }}
                className={cn(
                  "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-colors duration-300",
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </motion.div>
              <span className={cn(
                "absolute top-10 text-xs font-medium whitespace-nowrap transition-colors duration-300",
                isCurrent ? "text-foreground" : "text-muted-foreground",
                isCompleted && "text-foreground/80"
              )}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
