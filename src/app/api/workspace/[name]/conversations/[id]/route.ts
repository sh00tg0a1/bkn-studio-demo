import { NextResponse } from "next/server";
import type { Conversation } from "@/types/conversation";
import * as conv from "@/lib/conversations";
import * as ws from "@/lib/workspace";

type Params = { params: Promise<{ name: string; id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { name, id } = await params;
    const wsName = decodeURIComponent(name);
    await ws.getWorkspace(wsName);
    const conversation = await conv.getConversation(wsName, id);
    return NextResponse.json(conversation);
  } catch {
    return NextResponse.json({ error: "对话不存在" }, { status: 404 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { name, id } = await params;
    const wsName = decodeURIComponent(name);
    const convId = decodeURIComponent(id);
    await ws.getWorkspace(wsName);
    const body = (await req.json()) as {
      title?: string;
      messages?: unknown[];
      pinned?: boolean;
    };

    if (body.pinned !== undefined) {
      await conv.setConversationPinned(wsName, convId, body.pinned);
    }

    if (body.title !== undefined || body.messages !== undefined) {
      const existing = await conv.getConversation(wsName, convId);
      const next: Conversation = {
        ...existing,
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.messages !== undefined ? { messages: body.messages } : {}),
      };
      await conv.saveConversation(wsName, next);
    }

    const updated = await conv.getConversation(wsName, convId);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "对话不存在" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { name, id } = await params;
    const wsName = decodeURIComponent(name);
    const convId = decodeURIComponent(id);
    await ws.getWorkspace(wsName);
    await conv.deleteConversation(wsName, convId);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "对话不存在" }, { status: 404 });
  }
}
