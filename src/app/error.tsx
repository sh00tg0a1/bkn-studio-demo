"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RootError({
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
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-16 pt-20">
      <div className="border-destructive/20 bg-card w-full max-w-md rounded-xl border p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">应用出错</h1>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed">
          {error.message || "发生意外错误。"}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button type="button" variant="outline" asChild className="touch-manipulation">
            <Link href="/">返回首页</Link>
          </Button>
          <Button type="button" onClick={() => reset()} className="touch-manipulation">
            重试
          </Button>
        </div>
      </div>
    </div>
  );
}
