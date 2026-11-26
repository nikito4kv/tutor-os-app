"use client";

import { ErrorState } from "@/components/states/error-state";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState onRetry={reset} />;
}
