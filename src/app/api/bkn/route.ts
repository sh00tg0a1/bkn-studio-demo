import { NextResponse } from "next/server";
import * as kweaver from "@/lib/kweaver";

export async function GET() {
  try {
    const list = await kweaver.listBknNetworks();
    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
