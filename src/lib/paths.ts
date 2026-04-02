import path from "path";
import os from "os";

/** Override with `BKN_STUDIO_DIR` for tests. */
export function bknStudioDir(): string {
  return process.env.BKN_STUDIO_DIR ?? path.join(os.homedir(), ".bkn-studio");
}

export function workspacesIndexPath(): string {
  return path.join(bknStudioDir(), "workspaces.json");
}

export function workspaceRoot(name: string): string {
  return path.join(bknStudioDir(), name);
}

const MAX_WORKSPACE_NAME_LENGTH = 64;

/** Characters illegal in (at least) Windows file names + control chars. */
const FORBIDDEN_NAME_CHARS = /[\x00-\x1f<>:"/\\|?*]/;

/**
 * Trims and validates a workspace directory name.
 * Supports Chinese and other Unicode; forbids path segments and reserved names.
 */
export function normalizeWorkspaceName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("工作区名称不能为空");
  }
  if (trimmed.length > MAX_WORKSPACE_NAME_LENGTH) {
    throw new Error(
      `工作区名称长度须在 1–${MAX_WORKSPACE_NAME_LENGTH} 个字符之间`,
    );
  }
  if (trimmed === "." || trimmed === "..") {
    throw new Error('工作区名称不能使用 “.” 或 “..”');
  }
  if (FORBIDDEN_NAME_CHARS.test(trimmed)) {
    throw new Error(
      '工作区名称不能包含下列字符: < > : " / \\ | ? * 或换行等控制字符',
    );
  }
  if (process.platform === "win32" && /[. ]$/.test(trimmed)) {
    throw new Error("在 Windows 上，工作区名称不能以空格或句点结尾");
  }
  return trimmed;
}
