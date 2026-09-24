import { NextRequest, NextResponse } from "next/server";
import { buildPreview, mapErrorToStatus } from "@/src/server/http";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body.mandate !== "string" || !body.mandate.trim()) {
      return NextResponse.json(
        { error: 'Missing "mandate" string. Example: {"mandate":"60% mag7, 20% USDG, max 8%"}' },
        { status: 400 }
      );
    }
    const preview = await buildPreview(body);
    return NextResponse.json(preview);
  } catch (e) {
    const mapped = mapErrorToStatus(e);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
