import type { RowDataPacket } from "mysql2";
import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

/** True when MySQL skill registry env is set (host required). */
export function isSkillDatabaseConfigured(): boolean {
  return Boolean(process.env.SKILLS_DB_HOST?.trim());
}

function getPool(): mysql.Pool {
  if (!isSkillDatabaseConfigured()) {
    throw new Error("Skill 数据库未配置：请设置 SKILLS_DB_HOST 等环境变量");
  }
  if (!pool) {
    const host = process.env.SKILLS_DB_HOST!.trim();
    pool = mysql.createPool({
      host,
      port: Number(process.env.SKILLS_DB_PORT || 3306),
      user: process.env.SKILLS_DB_USER?.trim() || "root",
      password: process.env.SKILLS_DB_PASSWORD ?? "",
      database: process.env.SKILLS_DB_NAME?.trim() || "hd_supply",
      waitForConnections: true,
      connectionLimit: 5,
      enableKeepAlive: true,
    });
  }
  return pool;
}

export interface SkillDbRow {
  skill_id: string;
  name: string;
  description: string;
}

export async function listSkillsByKnId(knId: string): Promise<SkillDbRow[]> {
  const p = getPool();
  const [rows] = await p.execute<RowDataPacket[]>(
    "SELECT skill_id, name, description FROM skill WHERE kn_id = ? ORDER BY name ASC",
    [knId],
  );
  return rows.map((r) => ({
    skill_id: String(r.skill_id),
    name: String(r.name),
    description: r.description != null ? String(r.description) : "",
  }));
}

export async function upsertSkillRow(row: {
  skill_id: string;
  name: string;
  description: string | null;
  prd_module: string | null;
  kn_id: string;
  related_object_types: string | null;
  related_relations: string | null;
  rule_count: number | null;
  content: string;
}): Promise<void> {
  const p = getPool();
  await p.execute(
    `REPLACE INTO skill
      (skill_id, name, description, prd_module, kn_id,
       related_object_types, related_relations, rule_count, content)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.skill_id,
      row.name,
      row.description,
      row.prd_module,
      row.kn_id,
      row.related_object_types,
      row.related_relations,
      row.rule_count,
      row.content,
    ],
  );
}
