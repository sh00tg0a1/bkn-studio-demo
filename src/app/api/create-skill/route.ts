import matter from "gray-matter";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  isSkillDatabaseConfigured,
  upsertSkillRow,
} from "@/lib/skill-db";
import * as ws from "@/lib/workspace";

const bodySchema = z.object({
  workspaceName: z.string().min(1).max(200),
  skill_id: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "skill_id：小写字母、数字、连字符"),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(8000).optional(),
  /** 完整 SKILL.md；若省略 name/description 可从 frontmatter 推断 */
  content: z.string().min(1).max(2_000_000),
  kn_id: z.string().max(120).optional(),
  prd_module: z.string().max(16).optional(),
  related_object_types: z.string().max(4000).optional(),
  related_relations: z.string().max(4000).optional(),
  rule_count: z.number().int().min(0).max(1_000_000).optional().nullable(),
});

export async function POST(req: Request) {
  if (!isSkillDatabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "未配置 Skill 数据库：请在 .env.local 设置 SKILLS_DB_HOST、SKILLS_DB_PASSWORD 等变量",
      },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体须为 JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const {
    workspaceName,
    skill_id,
    content,
    kn_id: knOverride,
    prd_module,
    related_object_types,
    related_relations,
    rule_count,
  } = parsed.data;

  let name = parsed.data.name?.trim();
  let description = parsed.data.description?.trim() ?? "";

  try {
    const { data: fm } = matter(content);
    if (!name && typeof fm.name === "string" && fm.name.trim()) {
      name = fm.name.trim();
    }
    if (!description && typeof fm.description === "string") {
      description = fm.description.trim();
    }
    if (!name) {
      return NextResponse.json(
        { error: "缺少 name：请在 JSON 中提供 name，或在 SKILL.md frontmatter 中填写 name" },
        { status: 400 },
      );
    }

    const config = await ws.getWorkspace(workspaceName);
    const knId = knOverride?.trim() || config.bknId;

    await ws.saveWorkspaceSkillMarkdown(workspaceName, skill_id, content);

    await upsertSkillRow({
      skill_id,
      name,
      description: description || null,
      prd_module: prd_module?.trim() || null,
      kn_id: knId,
      related_object_types: related_object_types?.trim() || null,
      related_relations: related_relations?.trim() || null,
      rule_count: rule_count ?? null,
      content,
    });

    return NextResponse.json({
      ok: true as const,
      skill_id,
      name,
      kn_id: knId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("工作区") || msg.includes("ENOENT")) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
