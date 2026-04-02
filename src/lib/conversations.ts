import fs from "fs/promises";
import path from "path";
import type { Conversation, ConversationMeta } from "@/types/conversation";
import { workspaceRoot } from "@/lib/paths";

function conversationsDir(name: string): string {
  return path.join(workspaceRoot(name), "conversations");
}

function indexPath(name: string): string {
  return path.join(conversationsDir(name), "index.json");
}

function convPath(name: string, id: string): string {
  return path.join(conversationsDir(name), `${id}.json`);
}

async function readIndex(name: string): Promise<ConversationMeta[]> {
  try {
    const raw = await fs.readFile(indexPath(name), "utf-8");
    const parsed = JSON.parse(raw) as ConversationMeta[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIndex(
  name: string,
  entries: ConversationMeta[],
): Promise<void> {
  await fs.mkdir(conversationsDir(name), { recursive: true });
  await fs.writeFile(indexPath(name), JSON.stringify(entries, null, 2), "utf-8");
}

export async function listConversations(
  workspaceName: string,
): Promise<ConversationMeta[]> {
  const list = await readIndex(workspaceName);
  return list.sort((a, b) => {
    const pa = a.pinned ? 1 : 0;
    const pb = b.pinned ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return (
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  });
}

export async function getConversation(
  workspaceName: string,
  id: string,
): Promise<Conversation> {
  const raw = await fs.readFile(convPath(workspaceName, id), "utf-8");
  return JSON.parse(raw) as Conversation;
}

export async function createConversation(
  workspaceName: string,
): Promise<ConversationMeta> {
  const id = `conv-${Date.now()}`;
  const now = new Date().toISOString();
  const meta: ConversationMeta = {
    id,
    title: "新对话",
    createdAt: now,
    updatedAt: now,
    pinned: false,
  };
  const conv: Conversation = { id, title: meta.title, messages: [] };
  await fs.mkdir(conversationsDir(workspaceName), { recursive: true });
  await fs.writeFile(
    convPath(workspaceName, id),
    JSON.stringify(conv, null, 2),
    "utf-8",
  );
  const index = await readIndex(workspaceName);
  index.push(meta);
  await writeIndex(workspaceName, index);
  return meta;
}

export async function saveConversation(
  workspaceName: string,
  conversation: Conversation,
): Promise<void> {
  await fs.writeFile(
    convPath(workspaceName, conversation.id),
    JSON.stringify(conversation, null, 2),
    "utf-8",
  );
  const index = await readIndex(workspaceName);
  const idx = index.findIndex((e) => e.id === conversation.id);
  const now = new Date().toISOString();
  if (idx >= 0) {
    index[idx] = {
      ...index[idx],
      title: conversation.title,
      updatedAt: now,
    };
  } else {
    index.push({
      id: conversation.id,
      title: conversation.title,
      createdAt: now,
      updatedAt: now,
      pinned: false,
    });
  }
  await writeIndex(workspaceName, index);
}

export async function updateConversationTitle(
  workspaceName: string,
  id: string,
  title: string,
): Promise<void> {
  const conv = await getConversation(workspaceName, id);
  conv.title = title;
  await saveConversation(workspaceName, conv);
}

export async function setConversationPinned(
  workspaceName: string,
  id: string,
  pinned: boolean,
): Promise<void> {
  const index = await readIndex(workspaceName);
  const idx = index.findIndex((e) => e.id === id);
  if (idx < 0) {
    throw new Error("conversation not found");
  }
  index[idx] = { ...index[idx], pinned };
  await writeIndex(workspaceName, index);
}

export async function deleteConversation(
  workspaceName: string,
  id: string,
): Promise<void> {
  const index = await readIndex(workspaceName);
  const filtered = index.filter((e) => e.id !== id);
  if (filtered.length === index.length) {
    throw new Error("conversation not found");
  }
  await writeIndex(workspaceName, filtered);
  try {
    await fs.unlink(convPath(workspaceName, id));
  } catch {
    /* file may already be missing */
  }
}
