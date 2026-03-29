import { NextResponse } from "next/server";

import { readBoardData } from "@/lib/board-store";

export async function GET() {
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
