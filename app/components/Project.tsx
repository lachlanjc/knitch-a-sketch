"use client";

import { useCallback, useRef } from "react";

import type { CanvasHandle } from "./Canvas";
import type { ChatHandle } from "./Chat";

import Canvas from "./Canvas";
import Chat from "./Chat";

export default function Project() {
  const canvasRef = useRef<CanvasHandle | null>(null);
  const chatRef = useRef<ChatHandle | null>(null);
  const lastSubmittedVersionRef = useRef<number | null>(null);
  const submittingRef = useRef(false);

  const handleCanvasIdle = useCallback(async (version: number) => {
    if (submittingRef.current) {
      return;
    }

    if (lastSubmittedVersionRef.current === version) {
      return;
    }

    submittingRef.current = true;
    try {
      await chatRef.current?.submitCanvasSnapshot();
      lastSubmittedVersionRef.current = version;
    } finally {
      submittingRef.current = false;
    }
  }, []);

  return (
    <main className="grid h-screen grid-cols-1 lg:grid-cols-2">
      <Canvas
        ref={canvasRef}
        idleMs={500}
        onIdle={handleCanvasIdle}
        onDrawStart={() => chatRef.current?.cancelPending()}
      />
      <section className="p-6 lg:p-10">
        <Chat
          ref={chatRef}
          getCanvasSnapshot={async () =>
            canvasRef.current?.getSnapshotDataUrl() ?? null
          }
        />
      </section>
    </main>
  );
}
