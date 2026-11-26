import { describe, expect, it } from "vitest";
import {
  homeworkAssignedMessage,
  homeworkDueSoonMessage,
  homeworkReviewedMessage,
  lessonChangedMessage,
  lessonReminder2hMessage,
  lessonReminder24hMessage,
  lowBalanceMessage,
  homeworkSubmittedMessage,
  studentConnectedMessage,
} from "./messages";

const URL = "https://app.example.com/s/abc";

describe("student messages", () => {
  it("24h reminder includes the time and an open-cabinet link", () => {
    const msg = lessonReminder24hMessage("18 июня, 18:00", URL);
    expect(msg).toContain("18 июня, 18:00");
    expect(msg).toContain(URL);
  });
  it("2h reminder includes the time", () => {
    expect(lessonReminder2hMessage("18:00", URL)).toContain("18:00");
  });
  it("homework assigned includes the title", () => {
    expect(homeworkAssignedMessage("Задачи 4–7", URL)).toContain("Задачи 4–7");
  });
  it("homework due-soon includes title and deadline", () => {
    const msg = homeworkDueSoonMessage("Эссе", "19 июня, 20:00", URL);
    expect(msg).toContain("Эссе");
    expect(msg).toContain("19 июня, 20:00");
  });
  it("homework reviewed includes the title", () => {
    expect(homeworkReviewedMessage("Эссе", URL)).toContain("Эссе");
  });
});

describe("lessonChangedMessage", () => {
  it("single cancel mentions the time", () => {
    expect(lessonChangedMessage({ kind: "canceled", when: "18 июня, 18:00", url: URL })).toContain(
      "18 июня, 18:00",
    );
  });
  it("single reschedule mentions the new time", () => {
    expect(
      lessonChangedMessage({ kind: "rescheduled", when: "20 июня, 19:00", url: URL }),
    ).toContain("20 июня, 19:00");
  });
  it("bulk cancel mentions the count", () => {
    expect(lessonChangedMessage({ kind: "canceledMany", count: 3, url: URL })).toContain("3");
  });
  it("bulk reschedule mentions the count", () => {
    expect(lessonChangedMessage({ kind: "rescheduledMany", count: 5, url: URL })).toContain("5");
  });
});

describe("tutor messages", () => {
  it("low balance mentions student name and remaining count", () => {
    const msg = lowBalanceMessage("Анна", 2, URL);
    expect(msg).toContain("Анна");
    expect(msg).toContain("2");
  });
  it("homework submitted mentions student name and title", () => {
    const msg = homeworkSubmittedMessage("Анна", "Задачи 4–7", URL);
    expect(msg).toContain("Анна");
    expect(msg).toContain("Задачи 4–7");
  });
  it("student connected mentions the name", () => {
    expect(studentConnectedMessage("Анна", URL)).toContain("Анна");
  });
});
