import { WorkspaceApp } from "@/components/workspace/workspace-app";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  return <WorkspaceApp workspaceName={decodeURIComponent(name)} />;
}
