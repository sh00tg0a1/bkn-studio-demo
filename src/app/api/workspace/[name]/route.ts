import { NextResponse } from "next/server";
import { isSkillDatabaseConfigured } from "@/lib/skill-db";
import * as ws from "@/lib/workspace";

type Params = { params: Promise<{ name: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { name } = await params;
    const config = await ws.getWorkspace(decodeURIComponent(name));
    return NextResponse.json({
      ...config,
      skillsDbConfigured: isSkillDatabaseConfigured(),
    });
  } catch {
    return NextResponse.json({ error: "工作区不存在" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { name } = await params;
    await ws.deleteWorkspace(decodeURIComponent(name));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
