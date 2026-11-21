export const MAX_RECORDING_SECONDS = 60;
export const MAX_AUDIO_BYTES = 4_500_000;

const RECORDING_TYPES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"];

export function preferredRecordingType(isSupported: (type: string) => boolean) {
  return RECORDING_TYPES.find((type) => isSupported(type)) ?? "";
}

export function appendTranscript(draft: string, transcript: string, maxLength = 500) {
  const spoken = transcript.trim().replace(/\s+/g, " ");
  return [draft.trim(), spoken].filter(Boolean).join(" ").slice(0, maxLength);
}

export function formatRecordingTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
