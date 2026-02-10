"use client";

import { useState } from "react";
import Canvas from "./components/Canvas";

type Mode = "2d" | "3d";

export default function Home() {
  const [mode, setMode] = useState<Mode>("2d");

  return (
    <main className="flex h-screen w-screen bg-zinc-950 text-zinc-100">
      <section className="w-1/2 border-r border-zinc-800">
        <Canvas />
      </section>
      <section className="relative w-1/2 bg-zinc-900/40">
        <div className="flex h-full flex-col gap-10 px-10 py-12">
          <header className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.4em] text-zinc-400">
              Knitspace
            </div>
            <div className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900/60 p-1 text-xs uppercase tracking-[0.2em] text-zinc-300 shadow-inner">
              <button
                type="button"
                onClick={() => setMode("2d")}
                className={`rounded-full px-4 py-2 transition ${
                  mode === "2d"
                    ? "bg-zinc-100 text-zinc-950 shadow"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                2D
              </button>
              <button
                type="button"
                onClick={() => setMode("3d")}
                className={`rounded-full px-4 py-2 transition ${
                  mode === "3d"
                    ? "bg-zinc-100 text-zinc-950 shadow"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                3D
              </button>
            </div>
          </header>

          <div className="relative flex-1">
            <div className="absolute inset-0 rounded-[32px] border border-zinc-800 bg-zinc-950/60 p-8 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.8)]">
              <div className="flex h-full flex-col justify-between">
                <div className="space-y-4">
                  <div className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                    {mode === "2d" ? "Surface" : "Volume"}
                  </div>
                  <h1 className="text-3xl font-semibold text-zinc-100">
                    {mode === "2d"
                      ? "Sketch on the plane."
                      : "Move beyond the surface."}
                  </h1>
                  <p className="max-w-md text-sm text-zinc-400">
                    {mode === "2d"
                      ? "Capture gestures, annotate, and explore ideas in real time."
                      : "Layer depth studies, spatial flow, and sculpted marks."}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-zinc-500">
                  <span>Studio Preview</span>
                  <span>{mode === "2d" ? "Active" : "Experimental"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
