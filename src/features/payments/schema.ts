import { z } from "zod";
import { SHORT_TEXT_MAX } from "@/lib/constants";

const optionalText = z
  .string()
  .trim()
  .max(SHORT_TEXT_MAX)
  .optional()
  .transform((v) => (v ? v : null));

export const paymentSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Укажите сумму" })
    .positive("Сумма должна быть больше нуля"),
  // Date-only input ("YYYY-MM-DD") → ISO timestamp for the timestamptz column.
  paid_at: z.coerce.date().transform((d) => d.toISOString()),
  note: optionalText,
});

export type PaymentInput = z.infer<typeof paymentSchema>;

/** Parse a FormData payload into a validated PaymentInput. */
export function parsePaymentForm(formData: FormData) {
  return paymentSchema.safeParse({
    amount: formData.get("amount"),
    paid_at: formData.get("paid_at"),
    note: formData.get("note"),
  });
}
