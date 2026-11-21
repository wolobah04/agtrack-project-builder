import { describe, expect, it } from "vitest";
import { submitTranscript, formatRecordingTime } from "@/lib/speech";

describe("Farmer speech input", () => {
  it("automatically submits the transcript once without an edit or Send action", async () => {
    const questions: string[] = [];
    await submitTranscript("What is today's rain probability?", async (question) => { questions.push(question); });
    expect(questions).toEqual(["What is today's rain probability?"]);
  });

  it("normalizes recording whitespace and respects the 500-character message limit", async () => {
    const questions: string[] = [];
    const send = (question: string) => { questions.push(question); };
    await submitTranscript("  How much\n rice   do I have?  ", send);
    await submitTranscript("a".repeat(550), send);
    expect(questions[0]).toBe("How much rice do I have?");
    expect(questions[1]).toHaveLength(500);
  });

  it("does not submit an empty transcription", async () => {
    const questions: string[] = [];
    await expect(submitTranscript("  \n ", (question) => { questions.push(question); })).rejects.toThrow("clear question");
    expect(questions).toEqual([]);
  });

  it("formats the one-minute recording timer", () => {
    expect(formatRecordingTime(5)).toBe("0:05");
    expect(formatRecordingTime(60)).toBe("1:00");
  });
});
