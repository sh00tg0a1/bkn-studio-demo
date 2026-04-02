"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const SKILL_TEMPLATE = `---
name: 示例 Skill 名称
description: 简要说明何时使用此 Skill（供模型选择工具时参考）。
---

# 示例 Skill

## 说明

在此编写领域推理规则与步骤。
`;

export function CreateSkillDialog({
  workspaceName,
  open,
  onOpenChange,
  onCreated,
}: {
  workspaceName: string;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onCreated: () => void;
}) {
  const [skillId, setSkillId] = useState("");
  const [skillName, setSkillName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState(SKILL_TEMPLATE);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setFormError(null);
  }, [open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch("/api/create-skill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceName,
          skill_id: skillId.trim().toLowerCase(),
          name: skillName.trim() || undefined,
          description: description.trim() || undefined,
          content: content.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string | Record<string, unknown>;
      };
      if (!res.ok) {
        const err = data.error;
        setFormError(
          typeof err === "string"
            ? err
            : err
              ? JSON.stringify(err)
              : res.statusText,
        );
        return;
      }
      onCreated();
      onOpenChange(false);
      setSkillId("");
      setSkillName("");
      setDescription("");
      setContent(SKILL_TEMPLATE);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-[min(100vw-2rem,36rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <div className="border-border space-y-1.5 border-b p-6 pb-4">
          <DialogHeader>
            <DialogTitle>新建 Skill</DialogTitle>
            <DialogDescription className="text-left text-xs leading-relaxed">
              保存到工作区{" "}
              <span className="font-mono">skills/&lt;skill_id&gt;/SKILL.md</span>
              ，并在 MySQL 表{" "}
              <span className="font-mono">skill</span> 中写入/更新一行（
              <span className="font-mono">kn_id</span> 默认等于当前工作区知识网络
              ID）。需配置{" "}
              <span className="font-mono">SKILLS_DB_*</span> 环境变量。
            </DialogDescription>
          </DialogHeader>
        </div>
        <form
          onSubmit={(ev) => void onSubmit(ev)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="space-y-3 overflow-y-auto px-6 py-4">
            {formError ? (
              <p
                className="text-destructive bg-destructive/10 rounded-md px-2 py-1.5 text-xs"
                role="alert"
              >
                {formError}
              </p>
            ) : null}
            <div className="space-y-1.5">
              <label
                htmlFor="bkn-create-skill-id"
                className="text-xs font-medium"
              >
                Skill ID
              </label>
              <Input
                id="bkn-create-skill-id"
                value={skillId}
                onChange={(e) => setSkillId(e.target.value)}
                placeholder="my-domain-skill"
                className="font-mono text-sm"
                required
                autoComplete="off"
              />
              <p className="text-muted-foreground text-[11px]">
                小写字母、数字、连字符；将用作目录名与数据库主键。
              </p>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="bkn-create-skill-name"
                className="text-xs font-medium"
              >
                显示名称（可选）
              </label>
              <Input
                id="bkn-create-skill-name"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                placeholder="若 SKILL.md 含 frontmatter name 可留空"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="bkn-create-skill-desc"
                className="text-xs font-medium"
              >
                描述（可选）
              </label>
              <Input
                id="bkn-create-skill-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="可从 frontmatter description 读取"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="bkn-create-skill-md"
                className="text-xs font-medium"
              >
                SKILL.md 全文
              </label>
              <textarea
                id="bkn-create-skill-md"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[200px] w-full rounded-md border px-3 py-2 font-mono text-xs leading-relaxed focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                required
                spellCheck={false}
              />
            </div>
          </div>
          <DialogFooter className="border-border bg-muted/30 mt-auto shrink-0 border-t p-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              取消
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "保存中…" : "创建并同步数据库"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
