import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const WARNING_BEFORE_MS = 60 * 1000;   // Warn 1 minute before logout

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "keydown",
  "click",
  "scroll",
  "touchstart",
];

export function useAutoLogout(enabled: boolean = true) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const logout = useLogout();

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasWarnedRef = useRef(false);

  const performLogout = useCallback(async () => {
    try {
      await logout.mutateAsync();
    } catch {
      // Even if logout fails, clear local state
    }
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    toast.error("Session expired due to inactivity. Please sign in again.", {
      duration: 5000,
    });
    setLocation("/login");
  }, [logout, queryClient, setLocation]);

  const resetTimers = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    hasWarnedRef.current = false;

    // Set warning timer (fires 1 min before logout)
    warningRef.current = setTimeout(() => {
      if (!hasWarnedRef.current) {
        hasWarnedRef.current = true;
        toast.warning("You will be logged out in 1 minute due to inactivity.", {
          duration: 10000,
        });
      }
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      performLogout();
    }, IDLE_TIMEOUT_MS);
  }, [performLogout]);

  useEffect(() => {
    if (!enabled) return;

    resetTimers();

    const handleActivity = () => {
      resetTimers();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [enabled, resetTimers]);
}
