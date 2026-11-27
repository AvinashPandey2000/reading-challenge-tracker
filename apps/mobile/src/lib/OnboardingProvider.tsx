import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { hasOnboarded, setOnboarded } from "./onboarding";

interface OnboardingValue {
  /** null while the saved flag is being read */
  onboarded: boolean | null;
  complete: () => void;
  replay: () => void;
}

const Ctx = createContext<OnboardingValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [onboarded, setState] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    void hasOnboarded().then((v) => alive && setState(v));
    return () => {
      alive = false;
    };
  }, []);
  const complete = useCallback(() => {
    setState(true);
    void setOnboarded(true);
  }, []);
  const replay = useCallback(() => {
    setState(false);
    void setOnboarded(false);
  }, []);
  const value = useMemo(() => ({ onboarded, complete, replay }), [onboarded, complete, replay]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnboarding(): OnboardingValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOnboarding must be used inside <OnboardingProvider>");
  return ctx;
}
