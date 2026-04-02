"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

function bknOptionLabel(item: unknown): string {
  if (item && typeof item === "object") {
    const o = item as Record<string, unknown>;
    if (typeof o.name === "string" && o.name) return o.name;
    if (typeof o.id === "string" && o.id) return o.id;
    if (typeof o.network_id === "string") return o.network_id;
  }
  return JSON.stringify(item);
}

function bknOptionValue(item: unknown): string {
  if (item && typeof item === "object") {
    const o = item as Record<string, unknown>;
    if (typeof o.id === "string" && o.id) return o.id;
    if (typeof o.network_id === "string") return o.network_id;
  }
  return bknOptionLabel(item);
}

export function CreateWorkspaceDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [bknId, setBknId] = useState("");
  const [bknList, setBknList] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBkn = useCallback(async () => {
    try {
      const res = await fetch("/api/bkn");
      const data = (await res.json()) as unknown;
      if (Array.isArray(data)) setBknList(data);
      else if (data && typeof data === "object" && "error" in data) {
        setBknList([]);
      } else setBknList([]);
    } catch {
      setBknList([]);
    }
  }, []);

  useEffect(() => {
    if (open) void loadBkn();
  }, [open, loadBkn]);

  async function onCreate() {
    setError(null);
    const trimmedName = name.trim();
    const trimmedBkn = bknId.trim();
    if (!trimmedName || !trimmedBkn) {
      setError("请填写工作区名称与知识网络 ID");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, bknId: trimmedBkn }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "创建失败");
        return;
      }
      setOpen(false);
      setName("");
      setBknId("");
      router.push(`/workspace/${encodeURIComponent(trimmedName)}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新建工作区</DialogTitle>
          <DialogDescription>
            工作区名称支持中文、字母、数字、空格等（1–64
            字符，不可含路径分隔符及英文文件名非法字符）。需绑定一个 KWeaver
            知识网络 ID。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="ws-name">
              工作区名称
            </label>
            <Input
              id="ws-name"
              autoComplete="off"
              placeholder="例如 my-supply"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {bknList.length > 0 ? (
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="ws-bkn-select">
                知识网络
              </label>
              <select
                id="ws-bkn-select"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={bknId}
                onChange={(e) => setBknId(e.target.value)}
              >
                <option value="">请选择</option>
                {bknList.map((item, i) => (
                  <option key={i} value={bknOptionValue(item)}>
                    {bknOptionLabel(item)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="ws-bkn">
              知识网络 ID（手填）
            </label>
            <Input
              id="ws-bkn"
              autoComplete="off"
              placeholder="CLI 列表为空时可在此填写"
              value={bknId}
              onChange={(e) => setBknId(e.target.value)}
            />
          </div>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button type="button" disabled={loading} onClick={() => void onCreate()}>
            {loading ? "创建中…" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
