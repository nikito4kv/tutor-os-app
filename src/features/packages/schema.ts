import { z } from "zod";

export const packageSchema = z.object({
  total_lessons: z.coerce
    .number({ invalid_type_error: "Укажите число занятий" })
    .int("Целое число занятий")
    .positive("Минимум 1 занятие"),
  // Empty / missing price → null (price is nullable in the DB). Otherwise a
  // non-negative number. The preprocess guards against z.coerce turning "" into 0.
  price: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().nonnegative("Цена не может быть отрицательной").nullable(),
  ),
});

export type PackageInput = z.infer<typeof packageSchema>;

/** Parse a FormData payload into a validated PackageInput. */
export function parsePackageForm(formData: FormData) {
  return packageSchema.safeParse({
    total_lessons: formData.get("total_lessons"),
    price: formData.get("price"),
  });
}
