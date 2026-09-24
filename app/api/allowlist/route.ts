import { NextResponse } from "next/server";
import { ALLOWLIST } from "@/src/allowlist";

export async function GET() {
  return NextResponse.json({
    chain: 196,
    chainAlias: "xlayer",
    allowlist: ALLOWLIST,
  });
}
