import { NextResponse } from "next/server";
import * as ws from "@/lib/workspace";

type Params = { params: Promise<{ name: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { name } = await params;
    const list = await ws.listArtifacts(decodeURIComponent(name));
    return NextResponse.json(list);
  } catch {
    return NextResponse.json({ error: "工作区不存在" }, { status: 404 });
  }
}
