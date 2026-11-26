"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parsePaymentForm } from "./schema";

export interface PaymentFormState {
  ok?: boolean;
  error?: string;
}

export async function createPaymentAction(
  studentId: string,
  _prev: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const parsed = parsePaymentForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const supabase = await createClient();
  // RLS (payment_all → owns_student) guarantees the student belongs to this tutor.
  const { error } = await supabase.from("payment").insert({
    student_id: studentId,
    amount: parsed.data.amount,
    paid_at: parsed.data.paid_at,
    note: parsed.data.note,
  });
  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/students/${studentId}`);
  return { ok: true };
}

export async function deletePaymentAction(studentId: string, paymentId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("payment").delete().eq("id", paymentId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(`/students/${studentId}`);
}
