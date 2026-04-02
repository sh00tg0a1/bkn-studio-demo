import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspaceLoading() {
  return (
    <div
      className="flex min-h-dvh"
      role="status"
      aria-label="正在加载工作区"
    >
      <div className="bg-sidebar border-sidebar-border fixed top-0 left-0 z-40 hidden h-dvh w-72 border-r p-4 md:block">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="mt-4 h-24 w-full" />
        <Skeleton className="mt-4 h-20 w-full" />
      </div>
      <div className="hidden w-72 shrink-0 md:block" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col p-6">
        <Skeleton className="mx-auto h-64 w-full max-w-3xl" />
        <Skeleton className="mx-auto mt-6 h-10 w-full max-w-3xl" />
      </div>
    </div>
  );
}
