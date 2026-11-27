import { useEffect, useState } from "react";
import { AccessibilityInfo, Easing } from "react-native";

/** Material 3 standard easing + short durations (150–220 ms). */
export const motion = {
  short: 180,
  medium: 200,
  standard: Easing.bezier(0.2, 0, 0, 1),
};

/** Tracks the OS "Reduce motion" setting. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => mounted && setReduced(v));
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduced;
}
