import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION === "1" ? describe : describe.skip;

runIntegration("complete_lesson concurrency", () => {
  let supabase: ReturnType<typeof createAdminClient> | null = null;
  const email = `integration-${randomUUID()}@example.test`;
  let tutorId = "";
  let studentId = "";

  beforeAll(async () => {
    supabase = createAdminClient();
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email,
      password: "Integration1!",
      email_confirm: true,
      user_metadata: { name: "Integration tutor" },
    });
    if (userError || !user.user) {
      throw new Error(userError?.message ?? "Failed to create integration tutor");
    }
    tutorId = user.user.id;

    const { data: student, error: studentError } = await supabase
      .from("student")
      .insert({ tutor_id: tutorId, name: "Concurrency student" })
      .select("id")
      .single();
    if (studentError) throw new Error(studentError.message);
    studentId = student.id;
  });

  afterAll(async () => {
    if (supabase && tutorId) await supabase.auth.admin.deleteUser(tutorId);
  });

  it("charges two different packages when two lessons finish in parallel", async () => {
    if (!supabase) throw new Error("Integration client is not initialized");

    const firstPackageAt = new Date(Date.now() - 60_000).toISOString();
    const secondPackageAt = new Date().toISOString();
    const { error: packageError } = await supabase.from("package").insert([
      {
        student_id: studentId,
        total_lessons: 1,
        lessons_left: 1,
        price: 1000,
        created_at: firstPackageAt,
      },
      {
        student_id: studentId,
        total_lessons: 1,
        lessons_left: 1,
        price: 1000,
        created_at: secondPackageAt,
      },
    ]);
    if (packageError) throw new Error(packageError.message);

    const { data: lessons, error: lessonError } = await supabase
      .from("lesson")
      .insert([
        { student_id: studentId, starts_at: new Date().toISOString() },
        { student_id: studentId, starts_at: new Date(Date.now() + 3_600_000).toISOString() },
      ])
      .select("id");
    if (lessonError) throw new Error(lessonError.message);
    expect(lessons).toHaveLength(2);

    const [firstResult, secondResult] = await Promise.all([
      supabase.rpc("complete_lesson", { p_lesson_id: lessons![0]!.id }),
      supabase.rpc("complete_lesson", { p_lesson_id: lessons![1]!.id }),
    ]);

    expect(firstResult.error).toBeNull();
    expect(secondResult.error).toBeNull();

    const { data: packages, error: packagesError } = await supabase
      .from("package")
      .select("lessons_left")
      .eq("student_id", studentId);
    if (packagesError) throw new Error(packagesError.message);

    const { data: completedLessons, error: completedError } = await supabase
      .from("lesson")
      .select("charged_package_id")
      .eq("student_id", studentId);
    if (completedError) throw new Error(completedError.message);

    expect(packages?.reduce((sum, item) => sum + item.lessons_left, 0)).toBe(0);
    expect(new Set(completedLessons?.map((lesson) => lesson.charged_package_id)).size).toBe(2);
  });
});
