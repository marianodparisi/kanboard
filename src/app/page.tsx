import { BoardApp } from "@/components/board-app";
import { getServerSessionUser } from "@/lib/auth";
import { readBoardData } from "@/lib/board-store";

export default async function Home() {
  const sessionUser = await getServerSessionUser();
  const board = sessionUser ? await readBoardData() : null;

  return (
    <BoardApp
      initialAuthEmail={sessionUser?.email ?? null}
      initialBoard={board}
      initialUserName={sessionUser?.fullName ?? null}
    />
  );
}
