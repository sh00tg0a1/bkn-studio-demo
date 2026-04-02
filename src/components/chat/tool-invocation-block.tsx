"use client";

import { ChevronDown } from "lucide-react";
import type { UIMessage } from "@ai-sdk/react";
import type { DynamicToolUIPart, ToolUIPart, UITools } from "ai";
import { ArtifactOutputCard } from "@/components/artifact/artifact-output-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  extractFilenameFromRecord,
  toolDisplayName,
} from "@/lib/tool-display";

type AnyToolPart = ToolUIPart<UITools> | DynamicToolUIPart;

function stateLabel(state: AnyToolPart["state"]): string {
  switch (state) {
    case "input-streaming":
      return "输入中";
    case "input-available":
      return "执行中";
    case "output-available":
      return "完成";
    case "output-error":
      return "失败";
    default:
      return state;
  }
}

function toolNameFromPart(part: AnyToolPart): string {
  if (part.type === "dynamic-tool") return part.toolName;
  if (part.type.startsWith("tool-")) return part.type.slice("tool-".length);
  return "tool";
}

function JsonDetails({ summary, body }: { summary: string; body: string }) {
  return (
    <details className="border-border bg-card group overflow-hidden rounded-lg border text-sm shadow-sm">
      <summary className="hover:bg-muted/50 flex cursor-pointer list-none items-center gap-1 border-b border-transparent px-3 py-2 font-medium group-open:border-border [&::-webkit-details-marker]:hidden">
        <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
        {summary}
      </summary>
      <div className="border-border border-t">
        <pre className="max-h-52 overflow-auto bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-100 dark:bg-slate-950/95">
          {body}
        </pre>
      </div>
    </details>
  );
}

export function ToolInvocationBlock({
  part,
  workspaceName,
  onPreviewArtifact,
  className,
}: {
  part: UIMessage["parts"][number];
  workspaceName: string;
  onPreviewArtifact: (filename: string) => void;
  className?: string;
}) {
  if (part.type !== "dynamic-tool" && !part.type.startsWith("tool-")) {
    return null;
  }

  const p = part as AnyToolPart;
  const name = toolNameFromPart(p);
  const label = toolDisplayName(name);
  const state = stateLabel(p.state);

  const isWriteArtifact = name === "write_artifact";
  const filename =
    isWriteArtifact && (p.state === "input-available" || p.state === "output-available" || p.state === "output-error")
      ? extractFilenameFromRecord(p.input)
      : undefined;

  const detailJson = JSON.stringify(
    p.state === "output-available"
      ? { input: p.input, output: p.output }
      : p.state === "output-error"
        ? { input: p.input, errorText: p.errorText }
        : { state: p.state, input: p.input },
    null,
    2,
  );

  const isRunning =
    p.state === "input-streaming" || p.state === "input-available";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg px-2 py-1.5",
        isRunning && "ring-primary/25 ring-offset-background ring-1 ring-offset-1",
        className,
      )}
    >
      {isRunning ? (
        <>
          <div
            className="bg-primary/12 absolute inset-0 animate-pulse rounded-lg"
            aria-hidden
          />
          <div
            className="from-primary/0 via-primary/30 to-primary/0 bkn-tool-running-shimmer absolute inset-0 bg-gradient-to-r"
            aria-hidden
          />
        </>
      ) : null}
      <div className="relative space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              p.state === "output-error"
                ? "bg-destructive/15 text-destructive"
                : p.state === "output-available"
                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                  : isRunning
                    ? "bg-primary/20 text-primary animate-pulse"
                    : "bg-muted text-muted-foreground",
            )}
          >
            {state}
          </span>
          <span className="text-sm font-medium">{label}</span>
          {name !== label ? (
            <span className="text-muted-foreground font-mono text-xs">
              {name}
            </span>
          ) : null}
        </div>

        {isWriteArtifact && filename && p.state === "output-available" ? (
          <ArtifactOutputCard
            workspaceName={workspaceName}
            filename={filename}
            onPreview={onPreviewArtifact}
            className="!my-0 mt-2"
          />
        ) : null}

        <JsonDetails summary="查看请求与结果" body={detailJson} />
      </div>
    </div>
  );
}
