"use client";

import { useRef } from "react";
import Canvas, { type CanvasHandle } from "./components/Canvas";
import Chat from "./components/Chat";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const canvasRef = useRef<CanvasHandle | null>(null);

  return (
    <main className="grid max-h-screen grid-cols-1  lg:grid-cols-2">
      <Canvas ref={canvasRef} />
      <section className="p-6 lg:p-10">
        <Card className="h-full bg-zinc-950/40">
          {/*<CardHeader>
            <CardTitle className="text-xs uppercase tracking-[0.4em] text-zinc-400">
              Knitspace Chat
            </CardTitle>
          </CardHeader>*/}
          <CardContent className="flex h-full flex-col">
            <Chat
              getCanvasSnapshot={async () =>
                canvasRef.current?.getSnapshotDataUrl() ?? null
              }
            />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
