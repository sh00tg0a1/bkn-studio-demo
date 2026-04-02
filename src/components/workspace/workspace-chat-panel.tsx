"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { ToolInvocationBlock } from "@/components/chat/tool-invocation-block";
import { ArtifactPreviewSheet } from "@/components/artifact/artifact-preview-sheet";
import { workspaceHttpPath } from "@/lib/workspace-http";
import type { Conversation } from "@/types/conversation";

const jsonFetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
};

function nextTitle(messages: UIMessage[], previousTitle: string): string {
  if (previousTitle !== "新对话") return previousTitle;
  const user = messages.find((m) => m.role === "user");
  if (!user?.parts?.length) return previousTitle;
  let text = "";
  for (const p of user.parts) {
    if (p.type === "text") text += p.text;
  }
  const s = text.trim().slice(0, 60);
  return s || previousTitle;
}

function MessageParts({
  message,
  workspaceName,
  onPreviewArtifact,
}: {
  message: UIMessage;
  workspaceName: string;
  onPreviewArtifact: (filename: string) => void;
}) {
  return (
    <div className="space-y-2">
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          if (message.role === "assistant") {
            return (
              <ChatMarkdown
                key={i}
                source={part.text}
                workspaceName={workspaceName}
                onPreviewArtifact={onPreviewArtifact}
              />
            );
          }
          return (
            <p
              key={i}
              className="whitespace-pre-wrap text-base leading-relaxed sm:text-sm"
            >
              {part.text}
            </p>
          );
        }
        if (part.type === "reasoning") {
          return (
            <p
              key={i}
              className="text-muted-foreground border-l-2 pl-2 text-xs italic"
            >
              {part.text}
            </p>
          );
        }
        if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
          return (
            <ToolInvocationBlock
              key={i}
              part={part}
              workspaceName={workspaceName}
              onPreviewArtifact={onPreviewArtifact}
            />
          );
        }
        return null;
      })}
    </div>
  );
}

function StreamingIndicator({ status }: { status: string }) {
  if (status === "submitted") {
    return (
      <div className="border-border bg-card/70 mr-0 animate-in fade-in-0 slide-in-from-bottom-2 rounded-xl border px-4 py-3 duration-300 sm:mr-8">
        <div className="text-muted-foreground mb-2 text-xs font-medium">
          助手
        </div>
        <div className="flex items-center gap-1.5">
          <span className="bg-primary/60 size-1.5 animate-bounce rounded-full [animation-delay:0ms]" />
          <span className="bg-primary/60 size-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
          <span className="bg-primary/60 size-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
          <span className="text-muted-foreground ml-1.5 text-xs">思考中…</span>
        </div>
      </div>
    );
  }
  if (status === "streaming") {
    return (
      <div className="text-muted-foreground flex items-center gap-1.5 px-1 py-1 text-xs">
        <span className="bg-primary/60 size-1 animate-pulse rounded-full" />
        <span>生成中…</span>
      </div>
    );
  }
  return null;
}

function ChatInputBar({
  busy,
  onSend,
  onStop,
}: {
  busy: boolean;
  onSend: (text: string) => Promise<void>;
  onStop: () => void;
}) {
  const [input, setInput] = useState("");
  return (
    <form
      className="border-border bg-background/80 supports-[backdrop-filter]:bg-background/60 border-t p-4 backdrop-blur-sm transition-colors"
      onSubmit={(e) => {
        e.preventDefault();
        const t = input.trim();
        if (!t || busy) return;
        setInput("");
        void onSend(t);
      }}
    >
      <div className="mx-auto flex max-w-3xl gap-2">
        <label htmlFor="studio-chat-input" className="sr-only">
          输入聊天消息
        </label>
        <Input
          id="studio-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息…"
          disabled={busy}
          className="flex-1"
          autoComplete="off"
        />
        {busy ? (
          <Button type="button" variant="secondary" onClick={onStop}>
            停止
          </Button>
        ) : null}
        <Button type="submit" disabled={busy || !input.trim()}>
          发送
        </Button>
      </div>
    </form>
  );
}

function PersistedChat({
  workspaceName,
  conversation,
  onPersisted,
}: {
  workspaceName: string;
  conversation: Conversation;
  onPersisted?: () => void;
}) {
  const titleRef = useRef(conversation.title);
  titleRef.current = conversation.title;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { workspaceName },
      }),
    [workspaceName],
  );

  const initialMessages = useMemo((): UIMessage[] => {
    const raw = conversation.messages;
    if (!Array.isArray(raw)) return [];
    return raw as UIMessage[];
  }, [conversation.messages]);

  const persist = useCallback(
    async (messages: UIMessage[]) => {
      const title = nextTitle(messages, titleRef.current);
      titleRef.current = title;
      const res = await fetch(
        workspaceHttpPath(
          workspaceName,
          `/conversations/${encodeURIComponent(conversation.id)}`,
        ),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, title }),
        },
      );
      if (!res.ok) {
        console.error("Failed to persist conversation", await res.text());
        return;
      }
      onPersisted?.();
    },
    [workspaceName, conversation.id, onPersisted],
  );

  const [previewArtifact, setPreviewArtifact] = useState<string | null>(null);

  const { messages, sendMessage, status, stop, error, clearError } = useChat({
    id: conversation.id,
    messages: initialMessages,
    transport: transport as never,
    onFinish: (opts) => {
      if (opts.isError || opts.isAbort) return;
      void persist(opts.messages);
    },
  });

  const busy = status === "streaming" || status === "submitted";

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  useEffect(() => {
    const el = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    if (!el) return;
    const onScroll = () => {
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
      userScrolledUpRef.current = gap > 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (userScrolledUpRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  return (
    <>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {busy ? "助手正在生成回复" : ""}
      </div>
      <ScrollArea ref={scrollAreaRef} className="min-h-0 flex-1 p-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 ? (
            <div className="border-border bg-muted/40 rounded-xl border border-dashed p-6 text-center">
              <p className="text-muted-foreground text-base leading-relaxed sm:text-sm">
                向助手提问，或通过工具查询知识网络、生成成果文件。
              </p>
            </div>
          ) : null}
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "border-border bg-primary/10 animate-in fade-in-0 slide-in-from-bottom-1 ml-0 rounded-xl border px-4 py-3 duration-200 sm:ml-8"
                  : "border-border bg-card/70 animate-in fade-in-0 slide-in-from-bottom-1 mr-0 rounded-xl border px-4 py-3 duration-200 sm:mr-8"
              }
            >
              <div className="text-muted-foreground mb-2 text-xs font-medium">
                {m.role === "user" ? "你" : "助手"}
              </div>
              <MessageParts
                message={m}
                workspaceName={workspaceName}
                onPreviewArtifact={setPreviewArtifact}
              />
            </div>
          ))}
          {busy ? (
            <StreamingIndicator status={status} />
          ) : null}
          <div ref={bottomRef} aria-hidden className="h-1" />
        </div>
      </ScrollArea>
      {error ? (
        <div
          className="border-destructive/30 bg-destructive/5 text-destructive flex items-center justify-between gap-2 border-t px-4 py-2 text-sm"
          role="alert"
        >
          <span>{error.message}</span>
          <Button type="button" variant="ghost" size="sm" onClick={clearError}>
            关闭
          </Button>
        </div>
      ) : null}
      <ChatInputBar
        busy={busy}
        onSend={async (text) => {
          await sendMessage({ text });
        }}
        onStop={() => void stop()}
      />
      <ArtifactPreviewSheet
        workspaceName={workspaceName}
        filename={previewArtifact}
        open={previewArtifact !== null}
        onOpenChange={(next) => {
          if (!next) setPreviewArtifact(null);
        }}
      />
    </>
  );
}

export function WorkspaceChatPanel({
  workspaceName,
  conversationId,
  conversationsListLoading,
  onPersisted,
}: {
  workspaceName: string;
  conversationId: string | null;
  conversationsListLoading: boolean;
  onPersisted?: () => void;
}) {
  const convUrl =
    conversationId === null
      ? null
      : workspaceHttpPath(
          workspaceName,
          `/conversations/${encodeURIComponent(conversationId)}`,
        );

  const { data: conv, error } = useSWR(
    convUrl,
    (url) => jsonFetcher<Conversation>(url),
  );

  if (conversationId === null) {
    if (conversationsListLoading) {
      return (
        <div className="flex flex-1 flex-col p-4">
          <Skeleton className="mx-auto h-40 w-full max-w-3xl" />
        </div>
      );
    }
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="border-border bg-muted/40 max-w-md rounded-xl border border-dashed px-6 py-8 text-center">
          <p className="text-foreground text-base font-medium">暂无对话</p>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            请从侧栏创建会话；手机端先点左上角「菜单」。
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive flex flex-1 items-center justify-center p-8 text-sm">
        无法加载对话：{error.message}
      </div>
    );
  }

  if (!conv) {
    return (
      <div className="flex flex-1 flex-col p-4">
        <Skeleton className="mx-auto h-40 w-full max-w-3xl" />
      </div>
    );
  }

  return (
    <PersistedChat
      key={conv.id}
      workspaceName={workspaceName}
      conversation={conv}
      onPersisted={onPersisted}
    />
  );
}
