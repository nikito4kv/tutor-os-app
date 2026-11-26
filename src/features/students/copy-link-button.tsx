"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ONBOARDING_ACTIONS } from "@/features/onboarding/constants";
import { notifyOnboardingAction } from "@/features/onboarding/events";
import { t } from "@/lib/i18n";

export function CopyLinkButton({ url, className }: { url: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    notifyOnboardingAction(ONBOARDING_ACTIONS.share);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={copy}
      data-onboarding-target="copy-share-link"
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {t.students.copyLink}
    </Button>
  );
}
