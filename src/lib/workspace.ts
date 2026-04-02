import fs from "fs/promises";
import path from "path";
import type {
  ArtifactFile,
  ResourceFile,
  WorkspaceConfig,
  WorkspaceIndexEntry,
} from "@/types/workspace";
import {
  bknStudioDir,
  normalizeWorkspaceName,
  workspaceRoot,
  workspacesIndexPath,
} from "@/lib/paths";

async function ensureStudioDir(): Promise<void> {
  await fs.mkdir(bknStudioDir(), { recursive: true });
}

async function readIndex(): Promise<WorkspaceIndexEntry[]> {
  try {
    const raw = await fs.readFile(workspacesIndexPath(), "utf-8");
    const parsed = JSON.parse(raw) as WorkspaceIndexEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIndex(entries: WorkspaceIndexEntry[]): Promise<void> {
  await ensureStudioDir();
  await fs.writeFile(
    workspacesIndexPath(),
    JSON.stringify(entries, null, 2),
    "utf-8",
  );
}

async function scanWorkspacesFromDisk(): Promise<WorkspaceIndexEntry[]> {
  await ensureStudioDir();
  const names = await fs.readdir(bknStudioDir(), { withFileTypes: true });
  const out: WorkspaceIndexEntry[] = [];
  for (const d of names) {
    if (!d.isDirectory()) continue;
    const name = d.name;
    if (name.startsWith(".")) continue;
    try {
      const cfg = await getWorkspace(name);
      out.push({
        name: cfg.name,
        bknId: cfg.bknId,
        createdAt: cfg.createdAt,
      });
    } catch {
      // skip invalid dirs
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listWorkspaces(): Promise<WorkspaceIndexEntry[]> {
  const fromIndex = await readIndex();
  if (fromIndex.length > 0) return fromIndex;
  return scanWorkspacesFromDisk();
}

export async function getWorkspace(name: string): Promise<WorkspaceConfig> {
  const configPath = path.join(workspaceRoot(name), "config.json");
  const raw = await fs.readFile(configPath, "utf-8");
  return JSON.parse(raw) as WorkspaceConfig;
}

export async function createWorkspace(
  name: string,
  bknId: string,
): Promise<WorkspaceConfig> {
  const wsName = normalizeWorkspaceName(name);
  const trimmedBkn = bknId.trim();
  if (!trimmedBkn) {
    throw new Error("请选择或填写知识网络 ID");
  }

  const root = workspaceRoot(wsName);
  try {
    await fs.access(root);
    throw new Error("工作区已存在");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }

  const now = new Date().toISOString();
  const config: WorkspaceConfig = {
    name: wsName,
    bknId: trimmedBkn,
    createdAt: now,
    updatedAt: now,
  };

  await fs.mkdir(root, { recursive: true });
  const subdirs = [
    "skills",
    "resources",
    "conversations",
    "intermediate",
    "artifacts",
  ];
  for (const s of subdirs) {
    await fs.mkdir(path.join(root, s), { recursive: true });
  }
  await fs.writeFile(
    path.join(root, "config.json"),
    JSON.stringify(config, null, 2),
    "utf-8",
  );

  const index = await readIndex();
  if (!index.some((e) => e.name === wsName)) {
    index.push({ name: wsName, bknId: trimmedBkn, createdAt: now });
    await writeIndex(index);
  }

  return config;
}

const SKILL_ID_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;

/** Write `~/.bkn-studio/<ws>/skills/<skillId>/SKILL.md` (used by agent + DB registry). */
export async function saveWorkspaceSkillMarkdown(
  workspaceName: string,
  skillId: string,
  markdown: string,
): Promise<void> {
  const safe = path.basename(skillId.trim());
  if (safe !== skillId.trim() || !SKILL_ID_RE.test(safe)) {
    throw new Error(
      "Skill ID 无效：仅允许小写字母、数字、连字符，长度 1–63，且不能包含路径",
    );
  }
  const dir = path.join(workspaceRoot(workspaceName), "skills", safe);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "SKILL.md"), markdown, "utf-8");
}

export async function deleteWorkspace(name: string): Promise<void> {
  const root = workspaceRoot(name);
  await fs.rm(root, { recursive: true, force: true });
  const index = await readIndex();
  const next = index.filter((e) => e.name !== name);
  await writeIndex(next);
}

async function statFileList(
  dir: string,
): Promise<Array<{ name: string; size: number; mtime: Date }>> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: Array<{ name: string; size: number; mtime: Date }> = [];
    for (const e of entries) {
      if (!e.isFile()) continue;
      const full = path.join(dir, e.name);
      const st = await fs.stat(full);
      files.push({ name: e.name, size: st.size, mtime: st.mtime });
    }
    return files.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export async function listResources(
  workspaceName: string,
): Promise<ResourceFile[]> {
  const dir = path.join(workspaceRoot(workspaceName), "resources");
  const files = await statFileList(dir);
  return files.map((f) => ({
    name: f.name,
    size: f.size,
    modifiedAt: f.mtime.toISOString(),
  }));
}

export async function saveResource(
  workspaceName: string,
  fileName: string,
  data: Buffer,
): Promise<void> {
  const safe = path.basename(fileName);
  const dir = path.join(workspaceRoot(workspaceName), "resources");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, safe), data);
}

export async function deleteResource(
  workspaceName: string,
  fileName: string,
): Promise<void> {
  const safe = path.basename(fileName);
  await fs.unlink(path.join(workspaceRoot(workspaceName), "resources", safe));
}

export async function readResource(
  workspaceName: string,
  fileName: string,
): Promise<string> {
  const safe = path.basename(fileName);
  return fs.readFile(
    path.join(workspaceRoot(workspaceName), "resources", safe),
    "utf-8",
  );
}

export async function readResourceBuffer(
  workspaceName: string,
  fileName: string,
): Promise<Buffer> {
  const safe = path.basename(fileName);
  return fs.readFile(
    path.join(workspaceRoot(workspaceName), "resources", safe),
  );
}

export async function listArtifacts(
  workspaceName: string,
): Promise<ArtifactFile[]> {
  const dir = path.join(workspaceRoot(workspaceName), "artifacts");
  const files = await statFileList(dir);
  return files.map((f) => ({
    name: f.name,
    size: f.size,
    type: path.extname(f.name).replace(/^\./, "") || "bin",
    modifiedAt: f.mtime.toISOString(),
  }));
}

export async function readArtifact(
  workspaceName: string,
  fileName: string,
): Promise<Buffer> {
  const safe = path.basename(fileName);
  return fs.readFile(
    path.join(workspaceRoot(workspaceName), "artifacts", safe),
  );
}

export async function writeArtifact(
  workspaceName: string,
  fileName: string,
  content: string,
): Promise<void> {
  const safe = path.basename(fileName);
  const dir = path.join(workspaceRoot(workspaceName), "artifacts");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, safe), content, "utf-8");
}

export async function deleteArtifact(
  workspaceName: string,
  fileName: string,
): Promise<void> {
  const safe = path.basename(fileName);
  await fs.unlink(path.join(workspaceRoot(workspaceName), "artifacts", safe));
}

export async function touchWorkspaceUpdated(name: string): Promise<void> {
  const cfg = await getWorkspace(name);
  cfg.updatedAt = new Date().toISOString();
  await fs.writeFile(
    path.join(workspaceRoot(name), "config.json"),
    JSON.stringify(cfg, null, 2),
    "utf-8",
  );
}
