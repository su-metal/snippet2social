"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getOnboarding } from "@/lib/onboardingStorage";

const ONBOARDING_PATH = "/onboarding";

type OnboardingGateProps = {
  children: ReactNode;
};

export function OnboardingGate({ children }: OnboardingGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    setReady(false);
    const onboarding = getOnboarding();
    const hasOnboarding = Boolean(onboarding);
    const isOnboardingRoute = pathname === ONBOARDING_PATH || pathname.startsWith("/onboarding/");

    if (!hasOnboarding && !isOnboardingRoute) {
      router.replace(ONBOARDING_PATH);
      return;
    }


    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <p className="text-sm font-medium tracking-wide">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
