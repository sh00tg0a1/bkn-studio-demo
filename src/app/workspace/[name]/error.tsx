"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-lg font-semibold">工作区页面出错</h1>
      <p className="text-muted-foreground max-w-md text-center text-sm">
        {error.message || "发生意外错误，请重试。"}
      </p>
      <Button type="button" onClick={() => reset()}>
        重试
      </Button>
    </main>
  );
}
