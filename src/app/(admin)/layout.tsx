import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { assertAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Not signed in → /login; signed in but not an admin → /students.
  await assertAdmin();

  return (
    <div className="flex h-dvh min-h-dvh">
      <AdminSidebar />
      <main className="min-w-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="container px-4 pb-28 pt-20 sm:px-6 lg:px-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
