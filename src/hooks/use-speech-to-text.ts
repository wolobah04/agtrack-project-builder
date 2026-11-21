import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { appwriteAssistant, USE_APPWRITE } from "@/lib/appwrite";
import { MAX_AUDIO_BYTES, MAX_RECORDING_SECONDS, preferredRecordingType } from "@/lib/speech";

export type SpeechState = "idle" | "recording" | "transcribing";

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The recording could not be read. Please try again."));
    reader.onload = () => {
      if (typeof reader.result !== "string") return reject(new Error("The recording could not be read. Please try again."));
      resolve(reader.result.slice(reader.result.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}

function microphoneError(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") return "Microphone access is blocked. Allow microphone permission in your browser, then try again.";
  if (error instanceof DOMException && error.name === "NotFoundError") return "No microphone was found. Connect a microphone or type your question instead.";
  return "The microphone could not start. Check your browser permission and try again.";
}

export function useSpeechToText(onTranscript: (text: string) => void) {
  const [state, setState] = useState<SpeechState>("idle");
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const callbackRef = useRef(onTranscript);

  useEffect(() => { callbackRef.current = onTranscript; }, [onTranscript]);

  const release = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      setState("transcribing");
      recorderRef.current.stop();
    }
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    else {
      release();
      setState("idle");
      setSeconds(0);
    }
  }, [release]);

  const start = useCallback(async () => {
    if (state !== "idle") return;
    if (!USE_APPWRITE) {
      toast.error("Voice transcription needs the connected farm assistant. Please type your question in demo mode.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("This browser does not support voice recording. Please type your question instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const requestedType = preferredRecordingType((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, requestedType ? { mimeType: requestedType } : undefined);
      recorderRef.current = recorder;
      cancelledRef.current = false;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
      recorder.onerror = () => {
        release();
        setState("idle");
        setSeconds(0);
        toast.error("The recording stopped unexpectedly. Please try again.");
      };
      recorder.onstop = () => {
        const wasCancelled = cancelledRef.current;
        const recordedType = (recorder.mimeType || requestedType || "audio/webm").split(";")[0];
        const mimeType = recordedType === "audio/ogg" || recordedType === "audio/mp4" ? recordedType : "audio/webm";
        release();
        if (wasCancelled) {
          setState("idle");
          setSeconds(0);
          return;
        }
        setState("transcribing");
        void (async () => {
          try {
            const blob = new Blob(chunks, { type: mimeType });
            if (blob.size < 500) throw new Error("I couldn't hear a question. Please record for a little longer.");
            if (blob.size > MAX_AUDIO_BYTES) throw new Error("That recording is too large. Please keep your question under one minute.");
            const audioBase64 = await blobToBase64(blob);
            const result = await appwriteAssistant.transcribe(audioBase64, mimeType);
            if (!result.text.trim()) throw new Error("I couldn't hear a clear question. Please try again or type it instead.");
            callbackRef.current(result.text);
            toast.success("Voice message added. Review it, then tap Send.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Your voice message could not be transcribed. Please try again.");
          } finally {
            setState("idle");
            setSeconds(0);
          }
        })();
      };

      recorder.start(250);
      setSeconds(0);
      setState("recording");
      let elapsed = 0;
      timerRef.current = window.setInterval(() => {
        elapsed += 1;
        setSeconds(elapsed);
        if (elapsed >= MAX_RECORDING_SECONDS) stop();
      }, 1000);
    } catch (error) {
      release();
      setState("idle");
      toast.error(microphoneError(error));
    }
  }, [release, state, stop]);

  useEffect(() => () => {
    cancelledRef.current = true;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    release();
  }, [release]);

  return { state, seconds, start, stop, cancel };
}
