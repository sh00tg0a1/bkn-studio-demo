import { describe, expect, it } from "vitest";
import {
  extractFilenameFromRecord,
  toolDisplayName,
} from "@/lib/tool-display";

describe("tool-display", () => {
  it("toolDisplayName falls back to raw name", () => {
    expect(toolDisplayName("write_artifact")).toBe("保存成果");
    expect(toolDisplayName("unknown_tool_xyz")).toBe("unknown_tool_xyz");
  });

  it("extractFilenameFromRecord reads filename", () => {
    expect(extractFilenameFromRecord({ filename: "a.html" })).toBe("a.html");
    expect(extractFilenameFromRecord({})).toBeUndefined();
    expect(extractFilenameFromRecord(null)).toBeUndefined();
  });
});
