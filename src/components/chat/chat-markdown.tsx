"use client";

import type { ComponentPropsWithoutRef } from "react";
import { Check, Copy } from "lucide-react";
import {
  Children,
  isValidElement,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArtifactOutputCard } from "@/components/artifact/artifact-output-card";
import { Button } from "@/components/ui/button";
import { resolveArtifactDownloadHref } from "@/lib/artifact-link";
import { linkifyBareArtifactFilenames } from "@/lib/linkify-artifact-text";
import { cn } from "@/lib/utils";

function MarkdownAnchor({
  workspaceName,
  onPreviewArtifact,
  href,
  children,
  node: _node,
  ...rest
}: ComponentPropsWithoutRef<"a"> & {
  workspaceName: string;
  onPreviewArtifact: (filename: string) => void;
  node?: unknown;
}) {
  void _node;
  const resolved =
    href != null && href !== ""
      ? resolveArtifactDownloadHref(workspaceName, href)
      : null;

  if (resolved) {
    const linkText = textFromReactNode(children);
    return (
      <ArtifactOutputCard
        workspaceName={workspaceName}
        filename={resolved.filename}
        linkText={linkText}
        onPreview={onPreviewArtifact}
      />
    );
  }

  const finalHref = href;
  const external =
    href != null && (/^https?:\/\//i.test(href) || href.startsWith("//"));
  const newTab = external;

  return (
    <a
      {...rest}
      href={finalHref}
      target={newTab ? "_blank" : rest.target}
      rel={newTab ? "noreferrer noopener" : rest.rel}
    >
      {children}
    </a>
  );
}

function textFromReactNode(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromReactNode).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textFromReactNode(node.props.children);
  }
  return "";
}

function CodeCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [text]);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-foreground h-7 gap-1 px-2 text-[11px] touch-manipulation"
      onClick={() => void onCopy()}
      aria-label={copied ? "已复制" : "复制代码"}
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {copied ? "已复制" : "复制"}
    </Button>
  );
}

function MarkdownPre({ children }: { children?: ReactNode }) {
  let languageLabel = "代码";
  let codeClassName = "";
  let inner: ReactNode = children;

  try {
    const only = Children.only(children);
    if (isValidElement<{ className?: string; children?: ReactNode }>(only)) {
      codeClassName = only.props.className ?? "";
      const m = /language-(\w+)/.exec(codeClassName);
      if (m) languageLabel = m[1];
      inner = only;
    }
  } catch {
    /* multiple children — render plain pre */
    return (
      <pre className="border-border bg-muted/80 my-3 overflow-x-auto rounded-lg border p-3 font-mono text-xs leading-relaxed">
        {children}
      </pre>
    );
  }

  const raw = textFromReactNode(inner).replace(/\n$/, "");

  return (
    <div className="border-border bg-card my-3 overflow-hidden rounded-lg border shadow-sm">
      <div className="border-border bg-muted/50 flex h-9 items-center justify-between gap-2 border-b px-3">
        <span className="text-muted-foreground font-mono text-[11px] font-medium uppercase tracking-wide">
          {languageLabel}
        </span>
        <CodeCopyButton text={raw} />
      </div>
      <pre className="m-0 overflow-x-auto bg-slate-950 p-4 dark:bg-slate-950/95">
        <code
          className={cn(
            "block min-w-full whitespace-pre font-mono text-[13px] leading-[1.6] text-slate-100",
            codeClassName,
          )}
        >
          {isValidElement<{ children?: ReactNode }>(inner)
            ? inner.props.children
            : inner}
        </code>
      </pre>
    </div>
  );
}

function MarkdownCode({
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<"code">) {
  const isFence = /language-\w+/.test(className ?? "");
  if (isFence) {
    return (
      <code className={className} {...rest}>
        {children}
      </code>
    );
  }
  return (
    <code
      className={cn(
        "bg-muted/90 text-foreground rounded-md px-1.5 py-0.5 font-mono text-[0.875em] font-medium",
        "shadow-[inset_0_0_0_1px] shadow-border/70",
        className,
      )}
      {...rest}
    >
      {children}
    </code>
  );
}

const surfaceClassName =
  "chat-markdown text-foreground text-base leading-relaxed sm:text-sm " +
  "[&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline [&_a]:break-words " +
  "[&_strong]:font-semibold [&_em]:italic " +
  "[&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:first:mt-0 " +
  "[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:first:mt-0 " +
  "[&_h3]:mb-1.5 [&_h3]:mt-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:first:mt-0 " +
  "[&_.chat-markdown-p]:my-2 [&_.chat-markdown-p:first-child]:mt-0 [&_.chat-markdown-p:last-child]:mb-0 " +
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 " +
  "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_li]:my-1 [&_li]:leading-relaxed [&_li]:pl-0.5 " +
  "[&_ul_ul]:mt-1 [&_ul_ul]:mb-0 [&_ol_ol]:mt-1 [&_ol_ol]:mb-0 " +
  "[&_blockquote]:border-muted-foreground/35 [&_blockquote]:text-muted-foreground [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 " +
  "[&_hr]:border-border [&_hr]:my-4 " +
  "[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm " +
  "[&_th]:border [&_th]:border-border [&_th]:bg-muted/60 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium " +
  "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5";

/**
 * Renders assistant markdown in chat — lists, bold, tables, fenced code with toolbar + copy.
 * Artifact links render as preview cards (卡片内「预览」按钮 + 「打开」); other links behave as normal anchors.
 */
export function ChatMarkdown({
  source,
  workspaceName,
  onPreviewArtifact,
}: {
  source: string;
  workspaceName: string;
  onPreviewArtifact: (filename: string) => void;
}) {
  const text = source.trim();
  const markdownSource = useMemo(
    () => linkifyBareArtifactFilenames(source),
    [source],
  );
  if (!text) return null;
  return (
    <div className={surfaceClassName}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <div className="chat-markdown-p">{children}</div>
          ),
          pre: MarkdownPre,
          code: MarkdownCode,
          a: (props) => (
            <MarkdownAnchor
              workspaceName={workspaceName}
              onPreviewArtifact={onPreviewArtifact}
              {...props}
            />
          ),
        }}
      >
        {markdownSource}
      </ReactMarkdown>
    </div>
  );
}
