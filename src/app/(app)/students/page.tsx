import { Users } from "lucide-react";
import { listStudents } from "@/features/students/queries";
import { CreateStudentDialog } from "@/features/students/student-dialogs";
import { StudentList } from "@/features/students/student-list";
import { EmptyState } from "@/components/states/empty-state";
import { t } from "@/lib/i18n";

export default async function StudentsPage() {
  const students = await listStudents();

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-semibold">{t.students.title}</h1>
        <CreateStudentDialog />
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title={t.students.empty}
          action={<CreateStudentDialog />}
        />
      ) : (
        <StudentList students={students} />
      )}
    </div>
  );
}
