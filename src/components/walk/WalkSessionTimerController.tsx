import { useEffect } from "react";
import { useWellnessStore } from "../../store/wellnessStore";

/**
 * Headless controller for active walk sessions.
 * Subscribes ONLY to boolean `isSessionActive` so that 1-second state mutations
 * in `activeWalkSession` do not trigger re-renders of this component.
 * Executes a stable 1000ms interval calling `updateWalkSessionTick()`.
 */
export function WalkSessionTimerController(): null {
  const isSessionActive = useWellnessStore((s) => s.activeWalkSession !== null);

  useEffect(() => {
    if (!isSessionActive) return;

    const intervalId = window.setInterval(() => {
      useWellnessStore.getState().updateWalkSessionTick();
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isSessionActive]);

  return null;
}
