import * as kweaver from "@/lib/kweaver";

/** Normalized row from BKN skill 对象类型（name: skill，id 由服务端分配）。 */
export interface BknSkillMeta {
  skill_id: string;
  name: string;
  description: string;
  path?: string;
}

/**
 * Parse stdout from `kweaver bkn object-type query` into instance rows.
 */
export function parseBknQueryRows(stdout: string): Record<string, unknown>[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }
  if (Array.isArray(parsed)) {
    return parsed.filter(
      (x): x is Record<string, unknown> =>
        x !== null && typeof x === "object" && !Array.isArray(x),
    );
  }
  if (parsed && typeof parsed === "object") {
    const o = parsed as Record<string, unknown>;
    for (const key of ["datas", "data", "entries", "items", "list", "records", "rows", "result"]) {
      const v = o[key];
      if (Array.isArray(v)) {
        return v.filter(
          (x): x is Record<string, unknown> =>
            x !== null && typeof x === "object" && !Array.isArray(x),
        );
      }
    }
  }
  return [];
}

function strField(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/**
 * Parse stdout from `kweaver bkn object-type list <bknId>` into object type rows.
 */
export function parseBknObjectTypeList(stdout: string): Record<string, unknown>[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }
  if (Array.isArray(parsed)) {
    return parsed.filter(
      (x): x is Record<string, unknown> =>
        x !== null && typeof x === "object" && !Array.isArray(x),
    );
  }
  if (parsed && typeof parsed === "object") {
    const o = parsed as Record<string, unknown>;
    for (const key of [
      "entries",
      "object_types",
      "objectTypes",
      "datas",
      "data",
      "items",
      "list",
    ]) {
      const v = o[key];
      if (Array.isArray(v)) {
        return v.filter(
          (x): x is Record<string, unknown> =>
            x !== null && typeof x === "object" && !Array.isArray(x),
        );
      }
    }
  }
  return [];
}

function tagsIncludeSkill(ot: Record<string, unknown>): boolean {
  const tags = ot.tags;
  if (!Array.isArray(tags)) return false;
  return tags.some(
    (t) => typeof t === "string" && t.trim().toLowerCase() === "skill",
  );
}

function isSkillObjectType(ot: Record<string, unknown>): boolean {
  const name = strField(ot, "name", "Name", "code", "Code", "logical_id").toLowerCase();
  if (name === "skill") return true;
  const slug = strField(ot, "id", "Id").toLowerCase();
  if (
    slug === "skill"
  ) {
    return true;
  }
  return tagsIncludeSkill(ot);
}

/** Id passed to `kweaver bkn object-type query <bknId> <this> '<json>'` (often internal id, not slug `skill`). */
function objectTypeQueryIdFromRow(ot: Record<string, unknown>): string {
  return strField(
    ot,
    "object_type_id",
    "objectTypeId",
    "query_id",
    "queryId",
    "id",
    "Id",
  );
}

/**
 * From parsed object-type list, find the skill OT and return its query id.
 */
export function pickSkillObjectTypeQueryId(
  objectTypes: Record<string, unknown>[],
): string | undefined {
  for (const ot of objectTypes) {
    if (!isSkillObjectType(ot)) continue;
    const qid = objectTypeQueryIdFromRow(ot);
    if (qid) return qid;
  }
  return undefined;
}

/**
 * `kweaver bkn object-type list <bknId>` → resolve skill row → id for `object-type query`.
 */
export async function resolveSkillObjectTypeQueryId(bknId: string): Promise<string> {
  const raw = await kweaver.bknSchema(bknId);
  const list = parseBknObjectTypeList(raw);
  const id = pickSkillObjectTypeQueryId(list);
  if (!id) {
    throw new Error(
      "未在 object-type list 中找到 skill 对象类（需 name 为 skill 或 tags 含 Skill）",
    );
  }
  return id;
}

function rowToMeta(
  row: Record<string, unknown>,
  index: number,
): BknSkillMeta {
  const skill_id =
    strField(row, "skill_id", "skillId", "id", "Id") || `skill-${index}`;
  const name =
    strField(row, "name", "Name", "display_name", "displayName") || skill_id;
  const description = strField(
    row,
    "description",
    "Description",
    "comment",
    "Comment",
  );
  const path = strField(row, "path", "Path", "skill_path", "skillPath");
  const meta: BknSkillMeta = { skill_id, name, description };
  if (path) meta.path = path;
  return meta;
}

/**
 * Query skill instances: first `kweaver bkn object-type list <bknId>` to get skill OT id,
 * then `kweaver bkn object-type query <bknId> <objectTypeId> '{"limit":200}'`.
 */
export async function queryBknSkills(bknId: string): Promise<BknSkillMeta[]> {
  const objectTypeId = await resolveSkillObjectTypeQueryId(bknId);
  const out = await kweaver.bknQuery(bknId, objectTypeId, { limit: 200 });
  const rows = parseBknQueryRows(out);
  return rows
    .map((row, i) => rowToMeta(row, i))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}
