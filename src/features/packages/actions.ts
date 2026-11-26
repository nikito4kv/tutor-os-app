"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parsePackageForm } from "./schema";

export interface PackageFormState {
  ok?: boolean;
  error?: string;
}

export async function createPackageAction(
  studentId: string,
  _prev: PackageFormState,
  formData: FormData,
): Promise<PackageFormState> {
  const parsed = parsePackageForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const supabase = await createClient();
  // RLS (package_all → owns_student) guarantees the student belongs to this tutor.
  const { error } = await supabase.from("package").insert({
    student_id: studentId,
    total_lessons: parsed.data.total_lessons,
    lessons_left: parsed.data.total_lessons, // no DB default — set it explicitly
    price: parsed.data.price,
  });
  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/students/${studentId}`);
  return { ok: true };
}

export async function deletePackageAction(studentId: string, packageId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("package").delete().eq("id", packageId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(`/students/${studentId}`);
}
