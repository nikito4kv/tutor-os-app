export const ONBOARDING_STORAGE_KEY = "tutoros:onboarding:v1";
export const ONBOARDING_SIGNUP_START_STORAGE_KEY = "tutoros:onboarding-start-after-signup";
export const ONBOARDING_RESTART_EVENT = "tutoros:onboarding-restart";
export const ONBOARDING_STATE_EVENT = "tutoros:onboarding-state";
export const ONBOARDING_ACTION_EVENT = "tutoros:onboarding-action";
export const ONBOARDING_ACTION_INTENT_STORAGE_KEY = "tutoros:onboarding-action-intent";

export const ONBOARDING_ACTIONS = {
  overview: "overview",
  students: "students",
  balance: "balance",
  share: "share",
  schedule: "schedule",
  complete: "complete",
  homework: "homework",
  settings: "settings",
} as const;

export type OnboardingAction = (typeof ONBOARDING_ACTIONS)[keyof typeof ONBOARDING_ACTIONS];
