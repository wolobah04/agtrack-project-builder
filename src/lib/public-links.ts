const DEFAULT_PUBLIC_APP_ORIGIN = "https://project--1003bbae-3eeb-4b17-9ed0-fd044c80451a.lovable.app";
const configuredOrigin = (import.meta.env["VITE_PUBLIC_APP_URL"] as string | undefined)?.trim().replace(/\/+$/, "");

/** Buyer QR codes must never point at the private, login-protected preview host. */
export const PUBLIC_APP_ORIGIN = configuredOrigin || DEFAULT_PUBLIC_APP_ORIGIN;

export function publicBatchUrl(batchCode: string): string {
  return `${PUBLIC_APP_ORIGIN}/trace/${encodeURIComponent(batchCode.trim())}`;
}
