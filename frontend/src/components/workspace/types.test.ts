import { describe, expect, it } from "vitest";
import { citationFile, citationTitle } from "./types";

describe("citations", () => {
  it("titles markdown sources and only exposes safe file names", () => {
    expect(citationTitle({ source: "sop_spindle_bearing_replacement.md" })).toBe("SOP spindle bearing replacement");
    expect(citationTitle({ document: "OEM manual rev 4" })).toBe("OEM manual rev 4");
    expect(citationFile({ source: "cnc_lathe_manual.md" })).toBe("cnc_lathe_manual.md");
    expect(citationFile({ source: "../secrets.md" })).toBeNull();
    expect(citationFile({ source: "manual.pdf" })).toBeNull();
  });
});
