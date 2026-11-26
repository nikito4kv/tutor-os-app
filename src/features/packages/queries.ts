import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { packageBalance } from "./balance";

export type Package = Database["public"]["Tables"]["package"]["Row"];

/**
 * Total remaining lessons for a student — a light query (`lessons_left` only) for
 * the balance card shown on every tab, without loading full package rows.
 */
export async function getStudentBalance(studentId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("package")
    .select("lessons_left")
    .eq("student_id", studentId);

  if (error) {
    throw new Error(error.message);
  }
  return packageBalance(data);
}

/**
 * Minimal package rows ({student_id, lessons_left}) across ALL of the tutor's
 * students — for computing per-student balances on the dashboard in one query.
 * RLS scopes to the owner.
 */
export async function listPackageBalances(): Promise<
  Pick<Package, "student_id" | "lessons_left">[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("package").select("student_id, lessons_left");

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/** All packages for a student, newest first (RLS scopes to the owner). */
export async function listPackages(studentId: string): Promise<Package[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("package")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}
