export const MAX_RECORDING_SECONDS = 60;
export const MAX_AUDIO_BYTES = 4_500_000;

const RECORDING_TYPES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"];

export function preferredRecordingType(isSupported: (type: string) => boolean) {
  return RECORDING_TYPES.find((type) => isSupported(type)) ?? "";
}

export async function submitTranscript(transcript: string, send: (question: string) => void | Promise<void>) {
  const question = transcript.trim().replace(/\s+/g, " ").slice(0, 500);
  if (!question) throw new Error("I couldn't hear a clear question. Please try again or type it instead.");
  await send(question);
}

export function formatRecordingTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
