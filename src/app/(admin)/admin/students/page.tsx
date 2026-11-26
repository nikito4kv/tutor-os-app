import { redirect } from "next/navigation";

// Учеников отдельной страницей в админке больше не показываем — они доступны
// в карточке своего репетитора (/admin/users/[id]).
export default function AdminStudentsPage() {
  redirect("/admin/users");
}
