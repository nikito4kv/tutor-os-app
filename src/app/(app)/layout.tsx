import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { OnboardingTour } from "@/features/onboarding/onboarding-tour";
import { SupportWidget } from "@/features/support/support-widget";
import { getTutorUnreadChatCount } from "@/features/chat/queries";
import { getCurrentTutor, getIsAdmin } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (await getIsAdmin()) {
    redirect("/admin");
  }

  const [tutor, unreadChatCount] = await Promise.all([
    getCurrentTutor(),
    getTutorUnreadChatCount(),
  ]);
  const displayName = tutor.name || tutor.email;

  return (
    <div className="flex h-dvh min-h-dvh">
      <Sidebar tutorName={displayName} unreadChatCount={unreadChatCount} />
      <main className="min-w-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        {/* pb-28 reserves room for the fixed support FAB so it never overlaps content. */}
        <div className="container px-4 pb-36 pt-20 sm:px-6 lg:px-6 lg:py-8 lg:pb-28">
          {children}
        </div>
      </main>
      <OnboardingTour />
      {/* Tutor-only: the support widget is the tutor's bug/idea channel — keep it
          out of the student share page and the auth/landing routes. */}
      <SupportWidget />
    </div>
  );
}
