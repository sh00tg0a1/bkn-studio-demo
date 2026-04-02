import { NextResponse } from "next/server";
import * as ws from "@/lib/workspace";

export async function GET() {
  try {
    const workspaces = await ws.listWorkspaces();
    return NextResponse.json(workspaces);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { name?: string; bknId?: string };
    const { name, bknId } = body;
    if (!name || !bknId) {
      return NextResponse.json(
        { error: "name and bknId required" },
        { status: 400 },
      );
    }
    const config = await ws.createWorkspace(name, bknId);
    return NextResponse.json(config, { status: 201 });
  } catch (e) {
    const msg = (e as Error).message;
    const status = msg.includes("已存在") ? 409 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
