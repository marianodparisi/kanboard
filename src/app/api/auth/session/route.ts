import { NextResponse } from "next/server";

import { getServerSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getServerSessionUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  return NextResponse.json({ ok: true, user });
}
