import fs from "fs/promises";
import { homedir } from "os";
import path from "path";
import matter from "gray-matter";
import { queryBknSkills } from "@/lib/bkn-skills";
import { workspaceRoot } from "@/lib/paths";
import type { SkillContent } from "@/types/skill";

/** Cursor / Codex 等 Agent 常用：本机全局 Skill 包目录（各子目录含 SKILL.md）。 */
export function agentsHomeSkillsRoot(): string {
  return path.join(homedir(), ".agents", "skills");
}

/**
 * 当前仓库内随项目提供的 Skill（`pnpm dev` 时一般为仓库根下的 `.cursor/skills/`）。
 * 同名 skill_id 优先于 `~/.agents/skills/`。
 */
export function projectCursorSkillsRoot(): string {
  return path.join(process.cwd(), ".cursor", "skills");
}

/**
 * Scan `rootDir/<skillId>/SKILL.md` and return parsed skills (skips invalid dirs).
 */
export async function loadSkillsFromDirectory(
  rootDir: string,
): Promise<SkillContent[]> {
  try {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    const skills: SkillContent[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillPath = path.join(rootDir, entry.name, "SKILL.md");
      try {
        const raw = await fs.readFile(skillPath, "utf-8");
        const { data, content } = matter(raw);
        const name =
          typeof data.name === "string" && data.name
            ? data.name
            : entry.name;
        const description =
          typeof data.description === "string" ? data.description : "";
        skills.push({
          name,
          description,
          path: skillPath,
          content,
        });
      } catch {
        // skip invalid
      }
    }
    return skills.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  } catch {
    return [];
  }
}

/**
 * Skills for agent prompt: from BKN `skill` objects; optional SKILL.md via `path`.
 */
export async function loadSkillsForWorkspace(
  workspaceName: string,
  bknId: string,
): Promise<SkillContent[]> {
  let metas: Awaited<ReturnType<typeof queryBknSkills>>;
  try {
    metas = await queryBknSkills(bknId);
  } catch {
    metas = [];
  }
  const out: SkillContent[] = [];
  for (const meta of metas) {
    let name = meta.name;
    let description = meta.description;
    let skillPath = meta.path ?? "";
    let content: string;

    if (meta.path) {
      const resolved = path.isAbsolute(meta.path)
        ? meta.path
        : path.join(workspaceRoot(workspaceName), meta.path);
      try {
        const raw = await fs.readFile(resolved, "utf-8");
        const { data, content: body } = matter(raw);
        if (typeof data.name === "string" && data.name) name = data.name;
        if (typeof data.description === "string" && data.description) {
          description = data.description;
        }
        content = body;
        skillPath = resolved;
        out.push({ name, description, path: skillPath, content });
        continue;
      } catch {
        /* fall through: description-only */
      }
    }

    content =
      description.trim().length > 0
        ? description + "\n\n" + "(" + "\u77E5\u8BC6\u7F51\u7EDC Skill\uFF1A" + meta.skill_id + ")"
        : "(" + "\u77E5\u8BC6\u7F51\u7EDC\u5DF2\u767B\u8BB0 Skill\u300C" + name + "\u300D/" + meta.skill_id + "\uFF1B\u672A\u914D\u7F6E\u53EF\u8BFB path \u6216\u6587\u4EF6\u65E0\u6CD5\u8BFB\u53D6\u3002)";
    out.push({
      name,
      description,
      path: skillPath,
      content,
    });
  }

  const bknIds = new Set(metas.map((m) => m.skill_id));
  const localOnly = await loadWorkspaceSkills(workspaceName);
  const workspaceOnlyIds = new Set<string>();
  for (const s of localOnly) {
    const id = path.basename(path.dirname(s.path));
    if (bknIds.has(id)) continue;
    workspaceOnlyIds.add(id);
    out.push(s);
  }

  const reservedIds = new Set<string>([...bknIds, ...workspaceOnlyIds]);

  async function appendSkillsFromRoot(rootDir: string): Promise<void> {
    const list = await loadSkillsFromDirectory(rootDir);
    for (const s of list) {
      const id = path.basename(path.dirname(s.path));
      if (reservedIds.has(id)) continue;
      reservedIds.add(id);
      out.push(s);
    }
  }

  await appendSkillsFromRoot(projectCursorSkillsRoot());
  await appendSkillsFromRoot(agentsHomeSkillsRoot());

  return out.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}

/** Local workspace `skills/` only (no BKN). Prefer {@link loadSkillsForWorkspace} for Studio. */
export async function loadWorkspaceSkills(
  workspaceName: string,
): Promise<SkillContent[]> {
  return loadSkillsFromDirectory(
    path.join(workspaceRoot(workspaceName), "skills"),
  );
}

export function buildSkillsPromptSection(skills: SkillContent[]): string {
  if (skills.length === 0) return "";
  const sections = skills.map((s) => {
    return "## Skill: " + s.name + "\n> " + s.description + "\n\n" + s.content;
  });
  return (
    "\n\u5DF2\u52A0\u8F7D\u7684\u9886\u57DF\u77E5\u8BC6:\n\n---\n" +
    sections.join("\n---\n") +
    "\n---"
  );
}
