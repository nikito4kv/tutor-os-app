import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/features/landing/landing-page";

// Public marketing page. Signed-in tutors are sent straight to their workspace;
// everyone else sees the landing. Middleware keeps "/" reachable without auth.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/students");
  }

  return <LandingPage />;
}
