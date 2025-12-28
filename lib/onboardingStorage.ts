export type OnboardingRecord = {
  businessType: string;
  businessName: string;
  completedAt: string;
};

export const ONBOARDING_STORAGE_KEY = "misepo_onboarding_v1";

export function getOnboarding(): OnboardingRecord | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as OnboardingRecord;
  } catch (error) {
    console.error("Failed to parse onboarding record", error);
    return null;
  }
}

export function setOnboarding(data: { businessType: string; businessName: string }): OnboardingRecord {
  if (typeof window === "undefined") {
    throw new Error("Onboarding storage is not available on the server");
  }

  const payload: OnboardingRecord = {
    ...data,
    completedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export function clearOnboarding(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
}
