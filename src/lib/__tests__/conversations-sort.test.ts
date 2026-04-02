import { describe, expect, it } from "vitest";
import type { ConversationMeta } from "@/types/conversation";

/** Mirrors listConversations sort for regression */
function sortConvMetas(list: ConversationMeta[]): ConversationMeta[] {
  return [...list].sort((a, b) => {
    const pa = a.pinned ? 1 : 0;
    const pb = b.pinned ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return (
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  });
}

describe("conversation list order", () => {
  it("pins first, then by updatedAt desc", () => {
    const list: ConversationMeta[] = [
      {
        id: "a",
        title: "old pin",
        pinned: true,
        createdAt: "2020-01-01",
        updatedAt: "2020-01-01",
      },
      {
        id: "b",
        title: "new unpinned",
        createdAt: "2020-01-01",
        updatedAt: "2025-01-02",
      },
      {
        id: "c",
        title: "new pin",
        pinned: true,
        createdAt: "2020-01-01",
        updatedAt: "2025-01-03",
      },
    ];
    const sorted = sortConvMetas(list);
    expect(sorted.map((x) => x.id)).toEqual(["c", "a", "b"]);
  });
});
