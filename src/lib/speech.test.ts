import { describe, expect, it } from "vitest";
import { appendTranscript, formatRecordingTime } from "@/lib/speech";

describe("Farmer speech input", () => {
  it("adds a transcript to the editable draft without sending or replacing existing text", () => {
    expect(appendTranscript("Should I water?", "What is today's rain probability?")).toBe("Should I water? What is today's rain probability?");
  });

  it("normalizes recording whitespace and respects the 500-character message limit", () => {
    expect(appendTranscript("", "  How much\n rice   do I have?  ")).toBe("How much rice do I have?");
    expect(appendTranscript("", "a".repeat(550))).toHaveLength(500);
  });

  it("formats the one-minute recording timer", () => {
    expect(formatRecordingTime(5)).toBe("0:05");
    expect(formatRecordingTime(60)).toBe("1:00");
  });
});
