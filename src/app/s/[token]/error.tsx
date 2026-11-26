"use client";

import { ErrorState } from "@/components/states/error-state";

export default function ShareError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-2xl p-4 py-8">
      <ErrorState onRetry={reset} />
    </main>
  );
}
