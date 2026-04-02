import Link from "next/link";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { Button } from "@/components/ui/button";
import { listWorkspaces } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function Home() {
  const workspaces = await listWorkspaces();

  if (workspaces.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-16 pt-20 sm:px-8">
        <div className="border-border bg-card text-card-foreground w-full max-w-md rounded-xl border p-8 shadow-sm">
          <p className="text-primary text-xs font-semibold uppercase tracking-wider">
            KWeaver · BKN
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            BKN Studio
          </h1>
          <p className="text-muted-foreground mt-3 text-base leading-relaxed">
            尚未创建工作区。创建一个工作区以绑定知识网络并开始对话。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <CreateWorkspaceDialog>
              <Button
                size="lg"
                className="w-full touch-manipulation sm:w-auto"
                aria-haspopup="dialog"
              >
                新建工作区
              </Button>
            </CreateWorkspaceDialog>
          </div>
        </div>
        <p className="text-muted-foreground max-w-md text-center text-sm leading-relaxed">
          需配置{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
            LLM_API_BASE
          </code>{" "}
          与{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
            LLM_API_KEY
          </code>
          ；KWeaver CLI 见{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
            kweaver
          </code>
          。
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-16 pt-20 sm:px-8">
      <div className="border-border bg-card text-card-foreground w-full max-w-lg rounded-xl border p-8 shadow-sm">
        <p className="text-primary text-xs font-semibold uppercase tracking-wider">
          KWeaver · BKN
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          BKN Studio
        </h1>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed">
          选择工作区进入，或新建工作区。
        </p>
        <ul className="mt-6 space-y-2" role="list">
          {workspaces.map((w) => (
            <li key={w.name}>
              <Link
                href={`/workspace/${encodeURIComponent(w.name)}`}
                className="border-border bg-background hover:bg-muted/60 focus-visible:ring-ring block rounded-lg border px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="font-medium">{w.name}</span>
                <span className="text-muted-foreground mt-0.5 block font-mono text-xs">
                  BKN: {w.bknId}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex justify-center border-t border-border pt-6">
          <CreateWorkspaceDialog>
            <Button variant="outline" className="touch-manipulation" aria-haspopup="dialog">
              新建工作区
            </Button>
          </CreateWorkspaceDialog>
        </div>
      </div>
    </div>
  );
}
