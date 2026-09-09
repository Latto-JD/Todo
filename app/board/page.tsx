import { Suspense } from "react";
import { BoardView } from "./_components/BoardView";

export default function BoardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-zinc-500">보드를 불러오는 중...</div>
      }
    >
      <BoardView />
    </Suspense>
  );
}
