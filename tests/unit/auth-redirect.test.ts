import { describe, expect, it } from "vitest";
import {
  loginPathWithRedirect,
  safePostLoginRedirect,
  safeRedirectPath,
} from "@/lib/auth-redirect";

describe("safeRedirectPath", () => {
  it("accepts internal paths with search params", () => {
    expect(safeRedirectPath("/students/42?tab=homework")).toBe("/students/42?tab=homework");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeRedirectPath("https://example.com/students")).toBeUndefined();
    expect(safeRedirectPath("//example.com/students")).toBeUndefined();
    expect(safeRedirectPath("/%2fexample.com/students")).toBeUndefined();
    expect(safeRedirectPath("/\\example.com/students")).toBeUndefined();
  });
});

describe("safePostLoginRedirect", () => {
  it("rejects auth pages to avoid redirect loops after login", () => {
    expect(safePostLoginRedirect("/login")).toBeUndefined();
    expect(safePostLoginRedirect("/signup?redirect=/students")).toBeUndefined();
  });

  it("keeps app and admin destinations", () => {
    expect(safePostLoginRedirect("/schedule")).toBe("/schedule");
    expect(safePostLoginRedirect("/admin/users")).toBe("/admin/users");
  });
});

describe("loginPathWithRedirect", () => {
  it("builds a login URL that preserves the original page", () => {
    expect(loginPathWithRedirect("/schedule?view=month")).toBe(
      "/login?redirect=%2Fschedule%3Fview%3Dmonth",
    );
  });

  it("falls back to the login page for unsafe destinations", () => {
    expect(loginPathWithRedirect("https://example.com")).toBe("/login");
    expect(loginPathWithRedirect("/login")).toBe("/login");
  });
});
