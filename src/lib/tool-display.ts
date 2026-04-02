/** Human-readable labels for agent tools (system prompt / UI). */
export const TOOL_LABELS: Record<string, string> = {
  bkn_query: "BKN 查询",
  bkn_search: "语义搜索",
  bkn_schema: "对象类型列表",
  bkn_action: "执行 Action",
  read_resource: "读取资源",
  list_resources: "资源列表",
  write_artifact: "保存成果",
  list_artifacts: "成果列表",
};

export function toolDisplayName(toolName: string): string {
  return TOOL_LABELS[toolName] ?? toolName;
}

export function extractFilenameFromRecord(
  value: unknown,
): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const fn = (value as Record<string, unknown>).filename;
  return typeof fn === "string" && fn.trim() ? fn.trim() : undefined;
}
