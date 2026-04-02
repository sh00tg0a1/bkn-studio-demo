import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { loadSkillsFromDirectory } from "@/lib/skills";

describe("loadSkillsFromDirectory", () => {
  it("reads <id>/SKILL.md under root", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bkn-skills-"));
    try {
      await mkdir(join(dir, "demo-skill"));
      await writeFile(
        join(dir, "demo-skill", "SKILL.md"),
        "---\nname: Demo\ndescription: Test\n---\n\nHello",
        "utf-8",
      );
      const skills = await loadSkillsFromDirectory(dir);
      expect(skills).toHaveLength(1);
      expect(skills[0]?.name).toBe("Demo");
      expect(skills[0]?.description).toBe("Test");
      expect(skills[0]?.content.trim()).toBe("Hello");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns empty for missing directory", async () => {
    const skills = await loadSkillsFromDirectory(
      join(tmpdir(), "nonexistent-skills-root-xyz"),
    );
    expect(skills).toEqual([]);
  });
});
