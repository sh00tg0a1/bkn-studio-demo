import path from "path";
import { NextResponse } from "next/server";
import * as ws from "@/lib/workspace";

type Params = { params: Promise<{ name: string; file: string }> };

function contentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".html" || ext === ".htm") return "text/html; charset=utf-8";
  if (ext === ".md" || ext === ".markdown") return "text/markdown; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".txt" || ext === ".csv") return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { name, file } = await params;
    const wsName = decodeURIComponent(name);
    const fileName = decodeURIComponent(file);
    await ws.getWorkspace(wsName);
    const buf = await ws.readArtifact(wsName, fileName);
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": contentType(fileName) },
    });
  } catch {
    return NextResponse.json({ error: "成果不存在" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { name, file } = await params;
    const wsName = decodeURIComponent(name);
    const fileName = decodeURIComponent(file);
    await ws.getWorkspace(wsName);
    await ws.deleteArtifact(wsName, fileName);
    await ws.touchWorkspaceUpdated(wsName);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return NextResponse.json({ error: "成果不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
