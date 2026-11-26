import { LandingNav } from "./landing-nav";
import { LandingHero } from "./landing-hero";
import { LandingFeatures } from "./landing-features";
import { LandingSteps } from "./landing-steps";
import { LandingCta } from "./landing-cta";
import { LandingFooter } from "./landing-footer";

/** Public marketing landing page for tutorOS. */
export function LandingPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <LandingNav />
      <main className="flex-1">
        <LandingHero />
        <LandingFeatures />
        <LandingSteps />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
