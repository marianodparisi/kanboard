import { BoardApp } from "@/components/board-app";
import { readBoardData } from "@/lib/board-store";

export default async function Home() {
  const board = await readBoardData();

  return <BoardApp initialBoard={board} />;
}
