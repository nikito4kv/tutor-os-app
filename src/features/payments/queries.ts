import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Payment = Database["public"]["Tables"]["payment"]["Row"];

/**
 * Payment amounts within [fromISO, toISO) across ALL of the tutor's students —
 * for the dashboard "income this month" total. RLS scopes to the owner.
 */
export async function listPaymentAmountsInRange(fromISO: string, toISO: string): Promise<number[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment")
    .select("amount")
    .gte("paid_at", fromISO)
    .lt("paid_at", toISO);

  if (error) {
    throw new Error(error.message);
  }
  return data.map((p) => p.amount);
}

/** All payments for a student, newest first (RLS scopes to the owner). */
export async function listPayments(studentId: string): Promise<Payment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment")
    .select("*")
    .eq("student_id", studentId)
    .order("paid_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}
