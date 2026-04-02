import { NextResponse } from "next/server";
import * as ws from "@/lib/workspace";

type Params = { params: Promise<{ name: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { name } = await params;
    const list = await ws.listResources(decodeURIComponent(name));
    return NextResponse.json(list);
  } catch {
    return NextResponse.json({ error: "工作区不存在" }, { status: 404 });
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { name } = await params;
    const wsName = decodeURIComponent(name);
    await ws.getWorkspace(wsName);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "缺少 file 字段" }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    await ws.saveResource(wsName, file.name, buf);
    await ws.touchWorkspaceUpdated(wsName);
    return NextResponse.json({ ok: true, name: file.name }, { status: 201 });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("ENOENT") || msg.includes("不存在")) {
      return NextResponse.json({ error: "工作区不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
