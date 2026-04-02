"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Lightbulb, Pin, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { workspaceHttpPath } from "@/lib/workspace-http";
import type { ConversationMeta } from "@/types/conversation";
import type { ArtifactFile } from "@/types/workspace";
import type { ResourceFile } from "@/types/workspace";
import {
  ArtifactPreviewSheet,
  type WorkspacePreviewFileKind,
} from "@/components/artifact/artifact-preview-sheet";
import { cn } from "@/lib/utils";
import { CreateSkillDialog } from "./create-skill-dialog";
import { WorkspaceChatPanel } from "./workspace-chat-panel";

const SIDEBAR_WIDTH_KEY = "bkn-studio-sidebar-width";
const SIDEBAR_WIDTH_MIN = 220;
const SIDEBAR_WIDTH_MAX = 560;
const SIDEBAR_WIDTH_DEFAULT = 288; /* 18rem ≈ w-72 */

function readStoredSidebarWidth(): number {
  if (typeof window === "undefined") return SIDEBAR_WIDTH_DEFAULT;
  const n = Number.parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY) ?? "", 10);
  if (!Number.isFinite(n)) return SIDEBAR_WIDTH_DEFAULT;
  return Math.min(
    SIDEBAR_WIDTH_MAX,
    Math.max(SIDEBAR_WIDTH_MIN, n),
  );
}

const jsonFetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
};

export function WorkspaceApp({ workspaceName }: { workspaceName: string }) {
  const router = useRouter();
  const { mutate: globalMutate } = useSWRConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [sidebarFilePreview, setSidebarFilePreview] = useState<{
    kind: WorkspacePreviewFileKind;
    name: string;
  } | null>(null);
  const [createSkillOpen, setCreateSkillOpen] = useState(false);
  const [sidebarWidthPx, setSidebarWidthPx] = useState(readStoredSidebarWidth);
  const sidebarWidthRef = useRef(sidebarWidthPx);
  sidebarWidthRef.current = sidebarWidthPx;

  const onSidebarResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);
      const startX = e.clientX;
      const startW = sidebarWidthRef.current;
      const prevUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = "none";
      const clamp = (w: number) =>
        Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, w));
      const onMove = (ev: PointerEvent) => {
        setSidebarWidthPx(clamp(startW + ev.clientX - startX));
      };
      const onUp = (ev: PointerEvent) => {
        try {
          el.releasePointerCapture(ev.pointerId);
        } catch {
          /* already released */
        }
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.body.style.userSelect = prevUserSelect;
        try {
          localStorage.setItem(
            SIDEBAR_WIDTH_KEY,
            String(sidebarWidthRef.current),
          );
        } catch {
          /* quota / private mode */
        }
      };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [],
  );

  const configUrl = workspaceHttpPath(workspaceName, "");
  const {
    data: config,
    error: configError,
    mutate: mutateConfig,
  } = useSWR(configUrl, () =>
    jsonFetcher<{
      name: string;
      bknId: string;
      skillsDbConfigured?: boolean;
    }>(configUrl),
  );

  const convListUrl = workspaceHttpPath(workspaceName, "/conversations");
  const {
    data: convMetas,
    error: convListError,
    mutate: mutateConvMetas,
    isLoading: convListLoading,
  } = useSWR(convListUrl, () => jsonFetcher<ConversationMeta[]>(convListUrl));

  const {
    data: skills,
    error: skillsListError,
    isLoading: skillsListLoading,
    mutate: mutateSkills,
  } = useSWR(
    workspaceHttpPath(workspaceName, "/skills"),
    () =>
      jsonFetcher<
        { skill_id: string; name: string; description: string }[]
      >(workspaceHttpPath(workspaceName, "/skills")),
  );

  const { data: resources, mutate: mutateResources } = useSWR(
    workspaceHttpPath(workspaceName, "/resources"),
    () =>
      jsonFetcher<ResourceFile[]>(
        workspaceHttpPath(workspaceName, "/resources"),
      ),
  );

  const { data: artifacts, mutate: mutateArtifacts } = useSWR(
    workspaceHttpPath(workspaceName, "/artifacts"),
    () =>
      jsonFetcher<ArtifactFile[]>(
        workspaceHttpPath(workspaceName, "/artifacts"),
      ),
  );

  useEffect(() => {
    setActiveConvId(null);
  }, [workspaceName]);

  useEffect(() => {
    if (convMetas === undefined) return;
    if (activeConvId !== null) return;
    if (convMetas.length > 0) {
      setActiveConvId(convMetas[0].id);
    }
  }, [convMetas, activeConvId]);

  useEffect(() => {
    if (convMetas === undefined || activeConvId === null) return;
    if (!convMetas.some((c) => c.id === activeConvId)) {
      setActiveConvId(convMetas[0]?.id ?? null);
    }
  }, [convMetas, activeConvId]);

  const handleNewConversation = useCallback(async () => {
    const res = await fetch(convListUrl, { method: "POST" });
    if (!res.ok) return;
    const meta = (await res.json()) as ConversationMeta;
    setActiveConvId(meta.id);
    await mutateConvMetas();
  }, [convListUrl, mutateConvMetas]);

  const toggleConversationPinned = useCallback(
    async (c: ConversationMeta) => {
      const res = await fetch(
        `${convListUrl}/${encodeURIComponent(c.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pinned: !c.pinned }),
        },
      );
      if (!res.ok) return;
      await mutateConvMetas();
    },
    [convListUrl, mutateConvMetas],
  );

  const deleteConversationById = useCallback(
    async (id: string, title: string) => {
      if (!confirm(`确定删除对话「${title}」？`)) return;
      const others = (convMetas ?? []).filter((c) => c.id !== id);
      const nextActive =
        activeConvId === id ? (others[0]?.id ?? null) : activeConvId;
      const res = await fetch(`${convListUrl}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      if (activeConvId === id) setActiveConvId(nextActive);
      await mutateConvMetas();
    },
    [convListUrl, mutateConvMetas, activeConvId, convMetas],
  );

  const onConversationPersisted = useCallback(() => {
    void mutateConvMetas();
    if (activeConvId) {
      void globalMutate(
        workspaceHttpPath(
          workspaceName,
          `/conversations/${encodeURIComponent(activeConvId)}`,
        ),
      );
    }
  }, [mutateConvMetas, globalMutate, workspaceName, activeConvId]);

  async function onPickFile(f: FileList | null) {
    const file = f?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(workspaceHttpPath(workspaceName, "/resources"), {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      alert(err.error ?? "上传失败");
      return;
    }
    await mutateResources();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function deleteResource(name: string) {
    if (!confirm(`删除资源 ${name}？`)) return;
    const res = await fetch(
      `${workspaceHttpPath(workspaceName, "/resources")}/${encodeURIComponent(name)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      alert("删除失败");
      return;
    }
    setSidebarFilePreview((prev) =>
      prev?.kind === "resource" && prev.name === name ? null : prev,
    );
    await mutateResources();
  }

  async function deleteArtifactFile(name: string) {
    if (!confirm(`删除成果 ${name}？`)) return;
    const res = await fetch(
      `${workspaceHttpPath(workspaceName, "/artifacts")}/${encodeURIComponent(name)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      alert("删除失败");
      return;
    }
    setSidebarFilePreview((prev) =>
      prev?.kind === "artifact" && prev.name === name ? null : prev,
    );
    await mutateArtifacts();
  }

  async function deleteWorkspace() {
    if (!confirm("确定删除整个工作区？此操作不可恢复。")) return;
    const res = await fetch(workspaceHttpPath(workspaceName, ""), {
      method: "DELETE",
    });
    if (!res.ok) {
      alert("删除失败");
      return;
    }
    router.push("/");
    router.refresh();
  }

  const loadError = configError ?? convListError;
  const retrySidebar = () => {
    void mutateConfig();
    void mutateConvMetas();
  };

  const sectionTitle =
    "text-muted-foreground text-xs font-semibold uppercase tracking-wider";

  const sidebar = (
    <nav
      aria-label="工作区侧栏"
      className="flex h-full flex-col gap-5 p-4"
    >
      {loadError ? (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border p-2 text-xs"
        >
          <p className="font-medium">加载失败</p>
          <p className="mt-1 break-words">{loadError.message}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 h-7 w-full text-xs"
            onClick={() => retrySidebar()}
          >
            重试
          </Button>
        </div>
      ) : null}
      <div>
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 transition-colors hover:underline sm:min-h-9"
        >
          ← 返回首页
        </Link>
        <h2 className="mt-1 font-semibold tracking-tight">
          {config?.name ?? workspaceName}
        </h2>
        {config ? (
          <p className="text-muted-foreground mt-0.5 font-mono text-xs">
            BKN: {config.bknId}
          </p>
        ) : (
          <Skeleton className="mt-2 h-4 w-32" />
        )}
      </div>
      <Separator />
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className={sectionTitle}>对话</h3>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0 touch-manipulation"
            aria-label="新建对话"
            onClick={() => void handleNewConversation()}
          >
            <Plus className="size-4" aria-hidden />
          </Button>
        </div>
        <ScrollArea className="max-h-52 pr-2">
          {convListLoading || convMetas === undefined ? (
            <Skeleton className="h-8 w-full" />
          ) : convMetas.length === 0 ? (
            <p className="text-muted-foreground text-xs">暂无对话</p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {convMetas.map((c) => (
                <li
                  key={c.id}
                  className={cn(
                    "flex items-stretch gap-0.5 rounded-md border-l-2 transition-colors",
                    c.id === activeConvId
                      ? "border-primary bg-primary/10"
                      : "border-transparent hover:bg-muted/60",
                  )}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-0.5 size-9 shrink-0 touch-manipulation"
                    aria-label={c.pinned ? "取消置顶" : "置顶"}
                    aria-pressed={c.pinned === true}
                    onClick={() => void toggleConversationPinned(c)}
                  >
                    <Pin
                      className={cn(
                        "size-4",
                        c.pinned && "fill-primary text-primary",
                      )}
                      aria-hidden
                    />
                  </Button>
                  <button
                    type="button"
                    onClick={() => setActiveConvId(c.id)}
                    className="min-w-0 flex-1 py-2 pr-1 pl-0 text-left text-sm leading-snug transition-colors"
                  >
                    <span
                      className={cn(
                        "line-clamp-2",
                        c.id === activeConvId && "font-medium",
                      )}
                    >
                      {c.title}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-0.5 size-9 shrink-0 touch-manipulation text-muted-foreground hover:text-destructive"
                    aria-label={`删除对话 ${c.title}`}
                    onClick={() => void deleteConversationById(c.id, c.title)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>
      <Separator />
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className={sectionTitle}>Skills</h3>
          <div className="flex shrink-0 items-center gap-0.5">
            {config?.skillsDbConfigured ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 touch-manipulation"
                aria-label="新建 Skill"
                onClick={() => setCreateSkillOpen(true)}
              >
                <Plus className="size-3.5" aria-hidden />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 touch-manipulation"
              aria-label="刷新 Skills"
              onClick={() => void mutateSkills()}
            >
              <RefreshCw className="size-3" aria-hidden />
            </Button>
          </div>
        </div>
        <ScrollArea className="h-40 pr-2">
          {skillsListError ? (
            <div className="border-destructive/30 bg-destructive/5 rounded-lg border px-3 py-2.5" role="alert">
              <p className="text-destructive text-xs font-medium">
                无法加载 Skill
              </p>
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                请检查 kweaver 认证与知识网络连接
              </p>
            </div>
          ) : skillsListLoading || skills === undefined ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          ) : skills.length === 0 ? (
            <div className="border-border/60 rounded-lg border border-dashed px-3 py-4 text-center">
              <Lightbulb className="text-muted-foreground/40 mx-auto size-5" aria-hidden />
              <p className="text-muted-foreground mt-1.5 text-xs">
                暂无 Skill
              </p>
              <p className="text-muted-foreground/60 mt-0.5 text-[11px]">
                知识网络需包含 name 为 skill 的对象类；若已配置 MySQL Skill
                库，可用「+」从本机创建并写入数据库。
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {skills.map((s) => (
                <li
                  key={s.skill_id}
                  className="bg-muted/40 hover:bg-muted/70 group rounded-lg px-3 py-2 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="bg-primary/10 text-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded"
                      aria-hidden
                    >
                      <Lightbulb className="size-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium leading-5">
                        {s.name}
                      </p>
                      {s.description ? (
                        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-[1.4]">
                          {s.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>
      <Separator />
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className={sectionTitle}>资源</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            上传
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          aria-label="上传资源文件"
          onChange={(e) => void onPickFile(e.target.files)}
        />
        <ScrollArea className="h-24 pr-2">
          {!resources ? (
            <Skeleton className="h-6 w-full" />
          ) : resources.length === 0 ? (
            <p className="text-muted-foreground text-xs">暂无文件</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {resources.map((r) => (
                <li
                  key={r.name}
                  className="flex items-center justify-between gap-1"
                >
                  <a
                    className="text-primary min-w-0 flex-1 truncate underline-offset-2 hover:underline"
                    href={`${workspaceHttpPath(workspaceName, "/resources")}/${encodeURIComponent(r.name)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {r.name}
                  </a>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 touch-manipulation text-muted-foreground hover:text-foreground"
                      aria-label={`预览资源 ${r.name}`}
                      onClick={() =>
                        setSidebarFilePreview({
                          kind: "resource",
                          name: r.name,
                        })
                      }
                    >
                      <Eye className="size-3.5" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 touch-manipulation text-muted-foreground hover:text-destructive"
                      aria-label={`删除资源 ${r.name}`}
                      onClick={() => void deleteResource(r.name)}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>
      <Separator />
      <div className="min-h-0 flex-1">
        <h3 className={`mb-2 ${sectionTitle}`}>成果</h3>
        <ScrollArea className="h-32 pr-2">
          {!artifacts ? (
            <Skeleton className="h-6 w-full" />
          ) : artifacts.length === 0 ? (
            <p className="text-muted-foreground text-xs">暂无成果</p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {artifacts.map((a) => (
                <li
                  key={a.name}
                  className="flex items-center justify-between gap-1"
                >
                  <a
                    className="text-primary min-w-0 flex-1 truncate underline-offset-2 hover:underline"
                    href={`${workspaceHttpPath(workspaceName, "/artifacts")}/${encodeURIComponent(a.name)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {a.name}
                  </a>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 touch-manipulation text-muted-foreground hover:text-foreground"
                      aria-label={`预览 ${a.name}`}
                      onClick={() =>
                        setSidebarFilePreview({
                          kind: "artifact",
                          name: a.name,
                        })
                      }
                    >
                      <Eye className="size-3.5" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 touch-manipulation text-muted-foreground hover:text-destructive"
                      aria-label={`删除成果 ${a.name}`}
                      onClick={() => void deleteArtifactFile(a.name)}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>
      <div className="border-sidebar-border mt-auto space-y-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-xs touch-manipulation"
          onClick={() => {
            void mutateSkills();
            void mutateResources();
            void mutateArtifacts();
            void mutateConvMetas();
          }}
        >
          刷新侧栏
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="w-full text-xs touch-manipulation"
          onClick={() => void deleteWorkspace()}
        >
          删除工作区
        </Button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-dvh">
      <aside
        className="bg-sidebar text-sidebar-foreground border-sidebar-border fixed top-0 left-0 z-40 hidden h-dvh overflow-y-auto border-r md:block"
        style={{ width: sidebarWidthPx }}
      >
        {sidebar}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="拖动调整侧栏宽度"
          aria-valuemin={SIDEBAR_WIDTH_MIN}
          aria-valuemax={SIDEBAR_WIDTH_MAX}
          aria-valuenow={sidebarWidthPx}
          className="hover:bg-primary/15 absolute top-0 -right-1 z-50 hidden h-full w-3 cursor-col-resize touch-none md:block"
          onPointerDown={onSidebarResizePointerDown}
        >
          <span className="bg-border/80 hover:bg-primary/50 absolute top-0 right-1/2 h-full w-px translate-x-1/2" />
        </div>
      </aside>
      {/* 占位：与固定侧栏同宽，避免主栏被遮挡 */}
      <div
        className="hidden shrink-0 md:block"
        style={{ width: sidebarWidthPx }}
        aria-hidden
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="bg-sidebar text-sidebar-foreground border-sidebar-border flex h-12 shrink-0 items-center border-b pr-14 pl-3 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" aria-label="打开导航菜单">
                菜单
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>工作区</SheetTitle>
              </SheetHeader>
              {sidebar}
            </SheetContent>
          </Sheet>
          <span className="ml-3 truncate text-sm font-medium">
            {config?.name ?? workspaceName}
          </span>
        </div>
        <div
          id="workspace-main"
          role="region"
          aria-label="工作台与对话"
          className="flex min-h-0 min-w-0 flex-1 flex-col"
        >
          <WorkspaceChatPanel
            workspaceName={workspaceName}
            conversationId={activeConvId}
            conversationsListLoading={convListLoading || convMetas === undefined}
            onPersisted={onConversationPersisted}
          />
        </div>
      </div>
      <ArtifactPreviewSheet
        workspaceName={workspaceName}
        fileKind={sidebarFilePreview?.kind ?? "artifact"}
        filename={sidebarFilePreview?.name ?? null}
        open={sidebarFilePreview !== null}
        onOpenChange={(next) => {
          if (!next) setSidebarFilePreview(null);
        }}
      />
      <CreateSkillDialog
        workspaceName={workspaceName}
        open={createSkillOpen}
        onOpenChange={setCreateSkillOpen}
        onCreated={() => {
          void mutateSkills();
        }}
      />
    </div>
  );
}
