"use client";

import { useEffect, useState } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import {
  ONBOARDING_ACTIONS,
  ONBOARDING_RESTART_EVENT,
  ONBOARDING_STATE_EVENT,
  ONBOARDING_STORAGE_KEY,
} from "./constants";

type OnboardingStoredState = {
  status?: unknown;
  completedOnce?: unknown;
};

function readStoredState(): OnboardingStoredState | null {
  const stored = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
  if (!stored) return null;
  if (stored === "done") return { status: "completed", completedOnce: true };

  try {
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as OnboardingStoredState;
  } catch {
    return null;
  }
}

function hasCompletedOnce(): boolean {
  const stored = readStoredState();
  return stored?.completedOnce === true || stored?.status === "completed";
}

function needsOnboardingNotice(): boolean {
  const stored = readStoredState();
  if (!stored || stored.completedOnce === true) return false;
  return stored.status === "skipped" || stored.status === "active";
}

export function OnboardingSettingsPanel() {
  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    function syncNotice() {
      setShowNotice(needsOnboardingNotice());
    }

    syncNotice();
    window.addEventListener(ONBOARDING_STATE_EVENT, syncNotice);
    window.addEventListener("storage", syncNotice);
    return () => {
      window.removeEventListener(ONBOARDING_STATE_EVENT, syncNotice);
      window.removeEventListener("storage", syncNotice);
    };
  }, []);

  function restartOnboarding() {
    window.localStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({
        status: "active",
        currentStepId: ONBOARDING_ACTIONS.overview,
        completedStepIds: [],
        completedOnce: hasCompletedOnce(),
      }),
    );
    window.dispatchEvent(new Event(ONBOARDING_RESTART_EVENT));
    window.dispatchEvent(new Event(ONBOARDING_STATE_EVENT));
    setShowNotice(false);
  }

  return (
    <div className="space-y-3">
      {showNotice ? (
        <div className="flex gap-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">{t.settings.onboarding.noticeTitle}</p>
            <p>{t.settings.onboarding.noticeDescription}</p>
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        variant="outline"
        onClick={restartOnboarding}
        data-onboarding-target="restart-onboarding"
      >
        <RotateCcw className="size-4" />
        {t.settings.onboarding.restart}
      </Button>
    </div>
  );
}
