import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  escapeHtmlMultiline,
  homeworkAssignedEmail,
  lessonsScheduledEmail,
} from "./templates";

describe("escapeHtml", () => {
  it("escapes the HTML-unsafe characters", () => {
    expect(escapeHtml(`<script>"x" & 'y'`)).toBe("&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;");
  });
});

describe("escapeHtmlMultiline", () => {
  it("escapes and turns newlines into <br> (still neutralizing tags)", () => {
    expect(escapeHtmlMultiline("a\nb\r\n<c>")).toBe("a<br>b<br>&lt;c&gt;");
  });
});

describe("homeworkAssignedEmail", () => {
  const base = {
    studentName: "Анна",
    title: "Задачи 4–7",
    url: "https://tutor-os.online/s/anna-ab12",
  };

  it("puts the homework title in the subject", () => {
    expect(homeworkAssignedEmail(base).subject).toContain("Задачи 4–7");
  });

  it("includes the student name and link in the plain-text part", () => {
    const { text } = homeworkAssignedEmail(base);
    expect(text).toContain("Анна");
    expect(text).toContain(base.url);
  });

  it("includes the optional description only when present", () => {
    expect(homeworkAssignedEmail(base).text).not.toContain("Прочитать главу 3");
    const withDesc = homeworkAssignedEmail({ ...base, description: "Прочитать главу 3" });
    expect(withDesc.text).toContain("Прочитать главу 3");
    expect(withDesc.html).toContain("Прочитать главу 3");
  });

  it("escapes HTML in user-supplied fields (no injection)", () => {
    const { html } = homeworkAssignedEmail({ ...base, title: "<b>x</b>" });
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });

  it("preserves line breaks in a multi-line description (HTML <br>, text newline)", () => {
    const { html, text } = homeworkAssignedEmail({ ...base, description: "Строка 1\nСтрока 2" });
    expect(html).toContain("Строка 1<br>Строка 2");
    expect(text).toContain("Строка 1\nСтрока 2");
  });
});

describe("lessonsScheduledEmail", () => {
  const base = {
    studentName: "Анна",
    when: "12 июня, 17:00",
    url: "https://tutor-os.online/s/anna-ab12",
  };

  it("uses the singular subject and intro for one lesson", () => {
    const { subject, text } = lessonsScheduledEmail({ ...base, count: 1 });
    expect(subject).toBe("Запланирован урок");
    expect(text).toContain("запланирован урок");
    expect(text).toContain("12 июня, 17:00");
  });

  it("uses the plural subject for several lessons but still names the earliest time", () => {
    const { subject, text } = lessonsScheduledEmail({ ...base, count: 8 });
    expect(subject).toBe("Запланированы новые уроки");
    expect(text).toContain("12 июня, 17:00");
  });
});
