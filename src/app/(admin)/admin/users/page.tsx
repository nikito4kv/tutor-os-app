import type { Metadata } from "next";
import { AdminTutorList } from "@/features/admin/admin-directory-list";
import { listAdminTutors } from "@/features/admin/queries";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${t.admin.directory.usersTitle} - ${t.common.appName}`,
};
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const tutors = await listAdminTutors();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t.admin.directory.usersTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.admin.directory.usersSubtitle}</p>
      </div>

      <AdminTutorList tutors={tutors} />
    </div>
  );
}
