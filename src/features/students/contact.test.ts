import { describe, expect, it } from "vitest";
import { contactHref } from "./contact";

describe("contactHref", () => {
  it("returns null for empty / blank / nullish input", () => {
    expect(contactHref(null)).toBeNull();
    expect(contactHref(undefined)).toBeNull();
    expect(contactHref("   ")).toBeNull();
  });

  it("recognizes a Telegram @handle", () => {
    expect(contactHref("@ivan_petrov")).toEqual({
      href: "https://t.me/ivan_petrov",
      kind: "telegram",
    });
  });

  it("treats an email-looking @value as email, not Telegram", () => {
    expect(contactHref("anna@example.com")).toEqual({
      href: "mailto:anna@example.com",
      kind: "email",
    });
  });

  it("keeps http(s) links as-is, flagging t.me as Telegram", () => {
    expect(contactHref("https://example.com/x")).toEqual({
      href: "https://example.com/x",
      kind: "link",
    });
    expect(contactHref("https://t.me/ivan")).toEqual({
      href: "https://t.me/ivan",
      kind: "telegram",
    });
  });

  it("builds a tel: href from a formatted phone, stripping separators", () => {
    expect(contactHref("+7 (999) 123-45-67")).toEqual({
      href: "tel:+79991234567",
      kind: "phone",
    });
  });

  it("returns null for plain non-linkable text", () => {
    expect(contactHref("кабинет 204")).toBeNull();
  });
});
