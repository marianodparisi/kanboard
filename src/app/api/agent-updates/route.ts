import { NextRequest, NextResponse } from "next/server";

import { upsertProjectFromAgent } from "@/lib/board-store";
import { type AgentUpdatePayload, statuses } from "@/lib/types";

function isAuthorized(request: NextRequest) {
  const expectedToken = process.env.AGENT_SHARED_TOKEN;

  if (!expectedToken) {
    return true;
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${expectedToken}`;
}

function validatePayload(payload: Partial<AgentUpdatePayload>) {
  if (!payload.title || !payload.repository || !payload.summary || !payload.status) {
    return "Faltan campos obligatorios: title, repository, summary y status.";
  }

  if (!statuses.includes(payload.status)) {
    return `status debe ser uno de: ${statuses.join(", ")}.`;
  }

  return null;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Token no valido." }, { status: 401 });
  }

  const payload = (await request.json()) as Partial<AgentUpdatePayload>;
  const validationError = validatePayload(payload);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const result = await upsertProjectFromAgent(payload as AgentUpdatePayload);

  return NextResponse.json({
    ok: true,
    message: "Proyecto actualizado correctamente.",
    result,
  });
}
