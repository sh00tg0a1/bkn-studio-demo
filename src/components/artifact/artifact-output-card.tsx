"use client";

import { Eye, FileOutput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { workspaceHttpPath } from "@/lib/workspace-http";
import { cn } from "@/lib/utils";

export function ArtifactOutputCard({
  workspaceName,
  filename,
  linkText,
  onPreview,
  className,
}: {
  workspaceName: string;
  filename: string;
  /** Markdown link text; if different from filename, shown as title above path */
  linkText?: string;
  onPreview?: (name: string) => void;
  className?: string;
}) {
  const href = `${workspaceHttpPath(workspaceName, "/artifacts")}/${encodeURIComponent(filename)}`;
  const title = linkText?.trim() ?? "";
  const showSubtitle = title.length > 0 && title !== filename;

  return (
    <div
      role="group"
      className={cn(
        "border-border bg-card my-2 flex w-full max-w-full flex-col gap-3 rounded-lg border p-3 text-sm shadow-sm",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <FileOutput className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          {showSubtitle ? (
            <>
              <div className="truncate text-sm font-medium leading-snug">
                {title}
              </div>
              <div className="text-muted-foreground truncate font-mono text-xs">
                {filename}
              </div>
            </>
          ) : (
            <span className="block truncate font-mono text-xs font-medium leading-snug">
              {filename}
            </span>
          )}
        </div>
      </div>
      <div className="border-border flex flex-wrap items-center justify-end gap-2 border-t pt-2">
        {onPreview ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="touch-manipulation gap-1.5 px-3"
            onClick={() => onPreview(filename)}
          >
            <Eye className="size-3.5 shrink-0" aria-hidden />
            预览
          </Button>
        ) : null}
        <Button size="sm" variant="outline" className="touch-manipulation" asChild>
          <a href={href} target="_blank" rel="noreferrer">
            打开
          </a>
        </Button>
      </div>
    </div>
  );
}
