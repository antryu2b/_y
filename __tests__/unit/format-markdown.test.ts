/**
 * Format Markdown Tests (M4 adapted)
 */

import { localizeText, localizeReportTitle, cleanMarkdown } from "@/lib/format-markdown";

describe("Format Markdown", () => {
  describe("localizeText", () => {
    test("returns Korean text as-is when lang=ko", () => {
      const text = "GitHub Trending: 7개 고관련 AI 레포 발견";
      expect(localizeText(text, "ko")).toBe(text);
    });

    test("translates known Korean text to English", () => {
      expect(localizeText("주간 마케팅 이메일 발송 요청", "en")).toBe("Weekly marketing email dispatch request");
    });

    test("returns original text for unknown phrases", () => {
      const unknown = "totally unknown text xyz";
      expect(localizeText(unknown, "en")).toBe(unknown);
    });

    test("handles empty string", () => {
      expect(localizeText("", "en")).toBe("");
    });
  });

  describe("localizeReportTitle", () => {
    test("is a function", () => {
      expect(typeof localizeReportTitle).toBe("function");
    });

    test("returns string", () => {
      expect(typeof localizeReportTitle("test", "ko")).toBe("string");
    });
  });

  describe("cleanMarkdown", () => {
    test("removes markdown bold", () => {
      expect(cleanMarkdown("**bold**")).toBe("bold");
    });

    test("removes markdown headers", () => {
      expect(cleanMarkdown("## Header")).toBe("Header");
    });

    test("handles empty string", () => {
      expect(cleanMarkdown("")).toBe("");
    });
  });
});
