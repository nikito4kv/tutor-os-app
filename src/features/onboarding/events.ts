import {
  ONBOARDING_ACTION_EVENT,
  ONBOARDING_ACTION_INTENT_STORAGE_KEY,
  type OnboardingAction,
} from "./constants";

export function noteOnboardingActionIntent(action: OnboardingAction) {
  window.localStorage.setItem(ONBOARDING_ACTION_INTENT_STORAGE_KEY, action);
}

export function consumeOnboardingActionIntent(action: OnboardingAction): boolean {
  const stored = window.localStorage.getItem(ONBOARDING_ACTION_INTENT_STORAGE_KEY);
  if (stored !== action) return false;

  window.localStorage.removeItem(ONBOARDING_ACTION_INTENT_STORAGE_KEY);
  return true;
}

export function notifyOnboardingAction(action: OnboardingAction) {
  window.dispatchEvent(new CustomEvent(ONBOARDING_ACTION_EVENT, { detail: { action } }));
}
