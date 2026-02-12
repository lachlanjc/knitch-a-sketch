"use client";

import { JSONUIProvider, Renderer } from "@json-render/react";
import { useMemo } from "react";

import { registry } from "@/lib/registry";

import Generating from "./Generating";
import { useProjectContext } from "./ProjectContext";

interface ChatProps {
  className?: string;
}

export default function Chat({ className }: ChatProps) {
  const {
    state: { entries, selectedEntryId },
  } = useProjectContext();

  const selectedEntry = useMemo(() => {
    if (!selectedEntryId) {
      return null;
    }
    return entries.find((entry) => entry.id === selectedEntryId) ?? null;
  }, [entries, selectedEntryId]);

  useMemo(() => {
    console.log("[ui] selected entry", selectedEntry);
    return null;
  }, [selectedEntry]);

  const hasRenderableSpec = Boolean(
    selectedEntry?.spec && selectedEntry.spec.root
  );
  const initialState = useMemo(
    () => (selectedEntry?.spec?.state as Record<string, unknown>) ?? {},
    [selectedEntry?.spec?.state]
  );

  return (
    <div className={className}>
      <div>
        {selectedEntry ? (
          hasRenderableSpec ? (
            <JSONUIProvider registry={registry} initialState={initialState}>
              <Renderer
                spec={selectedEntry.spec}
                registry={registry}
                loading={selectedEntry.status === "pending"}
              />
            </JSONUIProvider>
          ) : selectedEntry.status === "pending" ? (
            <div className="grid min-h-[40vh] place-items-center text-sm text-zinc-400">
              <Generating />
            </div>
          ) : selectedEntry.status === "error" ? (
            <div className="grid min-h-[40vh] place-items-center text-sm text-zinc-400">
              Something went wrong. Try sketching again.
            </div>
          ) : (
            <div className="grid min-h-[40vh] place-items-center text-sm text-zinc-400">
              No response yet.
            </div>
          )
        ) : (
          <div className="grid min-h-[40vh] place-items-center text-sm text-zinc-400">
            Draw to begin.
          </div>
        )}
      </div>
    </div>
  );
}
