import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-16 pt-20">
      <div className="border-border bg-card w-full max-w-sm rounded-xl border p-8 text-center shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight">404</h1>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed">
          页面不存在，或工作区已被删除。
        </p>
        <Button asChild variant="outline" className="mt-6 touch-manipulation">
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    </div>
  );
}
