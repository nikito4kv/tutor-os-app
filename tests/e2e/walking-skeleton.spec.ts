import { test, expect } from "@playwright/test";

/**
 * MVP keeps e2e thin. This smoke test checks the app boots and gates access.
 *
 * TODO (when a test Supabase project + seed exist): expand to the full walking
 * skeleton — sign up → add student → add package → create lesson → finish lesson
 * (balance decrements) → assign homework → open /s/<token> as the student.
 * Keep it to ONE end-to-end test (see docs/MVP.md).
 */
test("unauthenticated user is sent to the login form", async ({ page }) => {
  await page.goto("/students");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: "Войти" })).toBeVisible();
});
