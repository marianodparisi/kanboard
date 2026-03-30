import { NextRequest, NextResponse } from "next/server";

import { authenticateUser, createSession, getSessionCookieName } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email y password son obligatorios." },
      { status: 400 },
    );
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    return NextResponse.json(
      { error: "Credenciales invalidas." },
      { status: 401 },
    );
  }

  const session = await createSession(user.id);
  const response = NextResponse.json({
    ok: true,
    user,
  });

  response.cookies.set({
    name: getSessionCookieName(),
    value: session.token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: session.expiresAt,
    path: "/",
  });

  return response;
}
