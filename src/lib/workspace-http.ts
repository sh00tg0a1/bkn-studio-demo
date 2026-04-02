/** Relative URL for workspace-scoped API routes (client-side fetch). */
export function workspaceHttpPath(workspaceName: string, suffix = ""): string {
  return `/api/workspace/${encodeURIComponent(workspaceName)}${suffix}`;
}
