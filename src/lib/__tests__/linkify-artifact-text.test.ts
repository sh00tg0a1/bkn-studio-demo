import { describe, expect, it } from "vitest";
import { linkifyBareArtifactFilenames } from "@/lib/linkify-artifact-text";

describe("linkifyBareArtifactFilenames", () => {
  it("linkifies a line with emoji prefix", () => {
    const s = "📄 pmc-delivery-risk-explainer.html\n\n查看说明。";
    expect(linkifyBareArtifactFilenames(s)).toBe(
      "📄 [pmc-delivery-risk-explainer.html](artifact:pmc-delivery-risk-explainer.html)\n\n查看说明。",
    );
  });

  it("does not touch fenced code", () => {
    const s = "用 `pmc-delivery-risk-explainer.html` 或\n\n```\npmc-delivery-risk-explainer.html\n```";
    expect(linkifyBareArtifactFilenames(s)).toBe(s);
  });

  it("does not match after URL path slash", () => {
    const s = "见 https://x.com/dir/pmc-delivery-risk-explainer.html";
    expect(linkifyBareArtifactFilenames(s)).toBe(s);
  });

  it("skips existing markdown links", () => {
    const s = "已保存 [报告](artifact:rep.html) 与 rep2.html";
    expect(linkifyBareArtifactFilenames(s)).toBe(
      "已保存 [报告](artifact:rep.html) 与 [rep2.html](artifact:rep2.html)",
    );
  });

  it("linkifies filename before Chinese period", () => {
    const s = "已保存为 pmc-delivery-risk-explainer.html。";
    expect(linkifyBareArtifactFilenames(s)).toBe(
      "已保存为 [pmc-delivery-risk-explainer.html](artifact:pmc-delivery-risk-explainer.html)。",
    );
  });
});
