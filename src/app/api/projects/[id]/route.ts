import { NextRequest, NextResponse } from "next/server";

import { getRequestSessionUser } from "@/lib/auth";
import {
  addProjectTask,
  deleteProjectTask,
  moveProject,
  reorderProjectTask,
  toggleProjectTask,
  updateProjectTaskLabel,
  updateProject,
} from "@/lib/board-store";
import { type ProjectStatus, type ProjectUpdatePayload, statuses } from "@/lib/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const sessionUser = await getRequestSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as
    | ({ action: "move"; status: ProjectStatus })
    | ({ action: "toggle_task"; taskIndex: number })
    | ({ action: "add_task"; label: string })
    | ({ action: "edit_task"; taskIndex: number; label: string })
    | ({ action: "delete_task"; taskIndex: number })
    | ({ action: "move_task"; fromIndex: number; toIndex: number })
    | ({ action?: "update" } & ProjectUpdatePayload);

  try {
    if (body.action === "move") {
      if (!statuses.includes(body.status)) {
        return NextResponse.json({ error: "Estado invalido." }, { status: 400 });
      }

      const project = await moveProject(id, body.status, sessionUser.fullName);
      return NextResponse.json({ ok: true, project });
    }

    if (body.action === "toggle_task") {
      const project = await toggleProjectTask(id, body.taskIndex, sessionUser.fullName);
      return NextResponse.json({ ok: true, project });
    }

    if (body.action === "add_task") {
      const project = await addProjectTask(id, body.label, sessionUser.fullName);
      return NextResponse.json({ ok: true, project });
    }

    if (body.action === "edit_task") {
      const project = await updateProjectTaskLabel(
        id,
        body.taskIndex,
        body.label,
        sessionUser.fullName,
      );
      return NextResponse.json({ ok: true, project });
    }

    if (body.action === "delete_task") {
      const project = await deleteProjectTask(id, body.taskIndex, sessionUser.fullName);
      return NextResponse.json({ ok: true, project });
    }

    if (body.action === "move_task") {
      const project = await reorderProjectTask(
        id,
        body.fromIndex,
        body.toIndex,
        sessionUser.fullName,
      );
      return NextResponse.json({ ok: true, project });
    }

    const project = await updateProject(id, body, sessionUser.fullName);
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar el proyecto." },
      { status: 400 },
    );
  }
}
