import { describe, expect, it } from "vitest";
import { PUBLIC_APP_ORIGIN, publicBatchUrl } from "./public-links";

describe("public buyer links", () => {
  it("uses the permanent public app address instead of the private preview", () => {
    expect(PUBLIC_APP_ORIGIN).toBe("https://agtrack.online");
    expect(PUBLIC_APP_ORIGIN).not.toContain("id-preview");
  });

  it("creates a direct batch-history link and encodes the batch code", () => {
    expect(publicBatchUrl("LR-RIC-2400")).toBe(`${PUBLIC_APP_ORIGIN}/trace/LR-RIC-2400`);
    expect(publicBatchUrl("LR RIC/2400")).toBe(`${PUBLIC_APP_ORIGIN}/trace/LR%20RIC%2F2400`);
  });
});
