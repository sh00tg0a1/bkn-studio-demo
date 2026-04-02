import { NextResponse } from "next/server";
import * as conv from "@/lib/conversations";
import * as ws from "@/lib/workspace";

type Params = { params: Promise<{ name: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { name } = await params;
    const wsName = decodeURIComponent(name);
    await ws.getWorkspace(wsName);
    const list = await conv.listConversations(wsName);
    return NextResponse.json(list);
  } catch {
    return NextResponse.json({ error: "工作区不存在" }, { status: 404 });
  }
}

export async function POST(_req: Request, { params }: Params) {
  try {
    const { name } = await params;
    const wsName = decodeURIComponent(name);
    await ws.getWorkspace(wsName);
    const meta = await conv.createConversation(wsName);
    return NextResponse.json(meta, { status: 201 });
  } catch {
    return NextResponse.json({ error: "工作区不存在" }, { status: 404 });
  }
}
