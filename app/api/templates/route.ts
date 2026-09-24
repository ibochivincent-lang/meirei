import { NextResponse } from "next/server";
import { listTemplates, getTemplate } from "@/src/mandate/templates";

export async function GET() {
  const templates = listTemplates().map((name) => ({
    name,
    template: getTemplate(name),
  }));
  return NextResponse.json({ ok: true, templates });
}
