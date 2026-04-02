"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { workspaceHttpPath } from "@/lib/workspace-http";

export type WorkspacePreviewFileKind = "artifact" | "resource";

function fileUrl(
  workspaceName: string,
  kind: WorkspacePreviewFileKind,
  filename: string,
): string {
  const base =
    kind === "resource" ? "/resources" : "/artifacts";
  return `${workspaceHttpPath(workspaceName, base)}/${encodeURIComponent(filename)}`;
}

function extOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i + 1).toLowerCase() : "";
}

function isBinaryPreviewExt(ext: string): boolean {
  return /^(png|jpe?g|gif|webp|svg|pdf)$/i.test(ext);
}

export function ArtifactPreviewSheet({
  workspaceName,
  filename,
  fileKind = "artifact",
  open,
  onOpenChange,
}: {
  workspaceName: string;
  filename: string | null;
  /** 成果默认 artifacts；资源走 /resources */
  fileKind?: WorkspacePreviewFileKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const url = filename ? fileUrl(workspaceName, fileKind, filename) : null;
  const ext = filename ? extOf(filename) : "";
  const useDirectMedia = Boolean(url && isBinaryPreviewExt(ext));

  const { data, error, isLoading } = useSWR(
    open && url && !useDirectMedia
      ? ["workspace-file-preview", fileKind, url]
      : null,
    async ([, , u]: [string, string, string]) => {
      const res = await fetch(u);
      if (!res.ok) {
        throw new Error(await res.text().catch(() => res.statusText));
      }
      return res.text();
    },
  );

  const kindLabel = fileKind === "resource" ? "资源" : "成果";

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-4xl lg:max-w-[min(92vw,56rem)]"
      >
        <SheetHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 pr-8">
          <SheetTitle className="min-w-0 truncate text-left font-mono text-base">
            <span className="text-muted-foreground mr-2 text-xs font-sans font-normal">
              {kindLabel}
            </span>
            {filename ?? kindLabel}
          </SheetTitle>
          {filename && url ? (
            <Button variant="outline" size="sm" asChild>
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                新窗口
              </a>
            </Button>
          ) : null}
        </SheetHeader>
        <ScrollArea className="mt-4 min-h-0 flex-1 pr-4">
          {!filename ? null : useDirectMedia && url ? (
            ext === "pdf" ? (
              <iframe
                title={filename}
                src={url}
                className="bg-background h-[min(82vh,720px)] w-full rounded-md border"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- same-origin workspace URL
              <img
                src={url}
                alt=""
                className="border-border mx-auto block max-h-[min(82vh,720px)] w-auto max-w-full rounded-md border object-contain"
              />
            )
          ) : isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-12 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中…
            </div>
          ) : error ? (
            <p className="text-destructive text-sm" role="alert">
              {(error as Error).message}
            </p>
          ) : data === undefined ? null : ext === "html" || ext === "htm" ? (
            <iframe
              title={filename}
              srcDoc={data}
              sandbox=""
              className="bg-background h-[min(82vh,720px)] w-full rounded-md border"
            />
          ) : ext === "md" || ext === "markdown" ? (
            <div className="text-foreground [&_a]:text-primary [&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-medium [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:bg-muted [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5 text-sm leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{data}</ReactMarkdown>
            </div>
          ) : ext === "json" ? (
            <pre className="bg-muted max-h-[min(82vh,720px)] overflow-auto rounded-md p-3 font-mono text-xs">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(data), null, 2);
                } catch {
                  return data;
                }
              })()}
            </pre>
          ) : (
            <pre className="bg-muted max-h-[min(82vh,720px)] overflow-auto whitespace-pre-wrap rounded-md p-3 font-mono text-xs">
              {data}
            </pre>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
