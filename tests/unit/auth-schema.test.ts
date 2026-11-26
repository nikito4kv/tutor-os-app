import { describe, it, expect } from "vitest";
import { signInSchema, signUpSchema, PASSWORD_RULES } from "@/features/auth/schema";

const validSignUp = {
  name: "Анна",
  email: "tutor@example.com",
  password: "Secret1!",
  confirmPassword: "Secret1!",
};

function withPassword(password: string) {
  return { ...validSignUp, password, confirmPassword: password };
}

describe("email normalization", () => {
  it("trims and lowercases the email", () => {
    const r = signInSchema.safeParse({ email: "  Tutor@Example.COM ", password: "x" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("tutor@example.com");
  });

  it("rejects a malformed email", () => {
    expect(signInSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
  });
});

describe("signUpSchema password policy (lower + upper + digit + symbol, >= 8)", () => {
  it("accepts a password meeting every rule", () => {
    expect(signUpSchema.safeParse(validSignUp).success).toBe(true);
  });

  it("rejects passwords shorter than 8 characters", () => {
    expect(signUpSchema.safeParse(withPassword("Ab1!")).success).toBe(false);
  });

  it("requires a lowercase letter", () => {
    expect(signUpSchema.safeParse(withPassword("SECRET1!")).success).toBe(false);
  });

  it("requires an uppercase letter", () => {
    expect(signUpSchema.safeParse(withPassword("secret1!")).success).toBe(false);
  });

  it("requires a digit", () => {
    expect(signUpSchema.safeParse(withPassword("Secret!!")).success).toBe(false);
  });

  it("requires a symbol", () => {
    expect(signUpSchema.safeParse(withPassword("Secret12")).success).toBe(false);
  });

  it("rejects a cyrillic-only password (no ASCII letters)", () => {
    expect(signUpSchema.safeParse(withPassword("Пароль12!")).success).toBe(false);
  });

  it("flags mismatched confirmPassword on the confirmPassword field", () => {
    const r = signUpSchema.safeParse({ ...validSignUp, confirmPassword: "Different1!" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.confirmPassword?.length).toBeGreaterThan(0);
    }
  });

  it("requires a name", () => {
    expect(signUpSchema.safeParse({ ...validSignUp, name: "   " }).success).toBe(false);
  });
});

describe("PASSWORD_RULES", () => {
  it("are all required and matched by a valid password", () => {
    expect(PASSWORD_RULES.every((r) => r.required)).toBe(true);
    expect(PASSWORD_RULES.every((r) => r.test(validSignUp.password))).toBe(true);
  });
});
