import { NextResponse } from "next/server";

import { getServerSessionUser } from "@/lib/auth";
import { readBoardData } from "@/lib/board-store";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const board = await readBoardData();

  return NextResponse.json({
    board,
    counts: {
      totalProjects: board.projects.length,
      inProgress: board.projects.filter(
        (project) => project.status === "in_progress",
      ).length,
      done: board.projects.filter((project) => project.status === "done").length,
    },
  });
}
