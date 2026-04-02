import { notFound } from "next/navigation";
import { getWorkspace } from "@/lib/workspace";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);
  try {
    await getWorkspace(decoded);
  } catch {
    notFound();
  }
  return children;
}
