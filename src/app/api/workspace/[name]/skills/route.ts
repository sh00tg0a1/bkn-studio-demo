import { NextResponse } from "next/server";
import { queryBknSkills } from "@/lib/bkn-skills";
import {
  isSkillDatabaseConfigured,
  listSkillsByKnId,
} from "@/lib/skill-db";
import * as ws from "@/lib/workspace";

type Params = { params: Promise<{ name: string }> };

type SkillListItem = {
  skill_id: string;
  name: string;
  description: string;
};

function mergeSkills(bkn: SkillListItem[], db: SkillListItem[]): SkillListItem[] {
  const map = new Map<string, SkillListItem>();
  for (const s of bkn) map.set(s.skill_id, { ...s });
  for (const s of db) map.set(s.skill_id, { ...s });
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "zh-CN"),
  );
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { name } = await params;
    const wsName = decodeURIComponent(name);
    const config = await ws.getWorkspace(wsName);

    let bknSkills: SkillListItem[] = [];
    try {
      const skills = await queryBknSkills(config.bknId);
      bknSkills = skills.map((s) => ({
        skill_id: s.skill_id,
        name: s.name,
        description: s.description,
      }));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (!isSkillDatabaseConfigured()) {
        return NextResponse.json(
          { error: `无法从知识网络加载 Skill：${message}`, skills: [] as const },
          { status: 502 },
        );
      }
    }

    if (!isSkillDatabaseConfigured()) {
      return NextResponse.json(bknSkills);
    }

    try {
      const dbSkills = await listSkillsByKnId(config.bknId);
      return NextResponse.json(mergeSkills(bknSkills, dbSkills));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (bknSkills.length > 0) {
        return NextResponse.json(bknSkills);
      }
      return NextResponse.json(
        {
          error: `Skill 数据库不可用：${message}`,
          skills: [] as const,
        },
        { status: 502 },
      );
    }
  } catch {
    return NextResponse.json({ error: "工作区不存在" }, { status: 404 });
  }
}
