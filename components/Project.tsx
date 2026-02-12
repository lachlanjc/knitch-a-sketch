"use client";

import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";

import { createSpecStreamCompiler } from "@json-render/core";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ProjectContextValue, SketchEntry } from "./ProjectContext";
import type { TreeSpec } from "@/lib/spec";

import Canvas from "./Canvas";
import Chat from "./Chat";
import { ProjectContext, useProjectContext } from "./ProjectContext";

const STORAGE_KEY = "knitspace.sketch.history.v1";

type CanvasProps = ComponentPropsWithoutRef<typeof Canvas>;
type ChatProps = ComponentPropsWithoutRef<typeof Chat>;

type ProjectCanvasProps = Omit<CanvasProps, "onIdle" | "onDrawStart"> & {
  idleMs?: number;
};

type ProjectPanelProps = PropsWithChildren;

type ProjectChatProps = ChatProps;

const ProjectCanvas = ({ idleMs = 500, ...props }: ProjectCanvasProps) => {
  const {
    actions: { submitSnapshot, cancelPending },
  } = useProjectContext();

  const handleIdle = useCallback(
    (version: number, snapshot: string | null) => {
      if (!snapshot) {
        return;
      }
      void submitSnapshot(version, snapshot);
    },
    [submitSnapshot]
  );

  const handleDrawStart = useCallback(() => {
    cancelPending();
  }, [cancelPending]);

  return (
    <Canvas
      idleMs={idleMs}
      onIdle={handleIdle}
      onDrawStart={handleDrawStart}
      {...props}
    />
  );
};

const ProjectPanel = ({ children }: ProjectPanelProps) => (
  <section className="px-6 lg:px-10">{children}</section>
);

const ProjectChat = (props: ProjectChatProps) => <Chat {...props} />;

const Project = ({ children }: PropsWithChildren) => {
  const hasLoadedHistoryRef = useRef(false);
  const lastSubmittedVersionRef = useRef<number | null>(null);
  const activeEntryIdRef = useRef<string | null>(null);
  const [entries, setEntries] = useState<SketchEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const streamSpec = useCallback(async (entryId: string, dataUrl: string) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId ? { ...entry, status: "pending" } : entry
      )
    );

    const compiler = createSpecStreamCompiler<TreeSpec>({});
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Generate a knitting pattern UI for this sketch.",
          context: { imageDataUrl: dataUrl },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        const { result, newPatches } = compiler.push(chunk);
        if (newPatches.length > 0) {
          console.log("[ui] spec patch", result);
          setEntries((prev) =>
            prev.map((entry) =>
              entry.id === entryId
                ? { ...entry, spec: result, status: "pending" }
                : entry
            )
          );
        }
      }

      const finalSpec = compiler.getResult();
      console.log("[ui] spec complete", finalSpec);
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? { ...entry, spec: finalSpec, status: "ready" }
            : entry
        )
      );
      setSelectedEntryId(entryId);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      console.log("[ui] spec error", err);
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, status: "error" } : entry
        )
      );
    } finally {
      if (activeEntryIdRef.current === entryId) {
        activeEntryIdRef.current = null;
      }
    }
  }, []);

  const cancelPending = useCallback(() => {
    const entryId = activeEntryIdRef.current;
    if (!entryId) {
      return;
    }
    activeEntryIdRef.current = null;
    abortControllerRef.current?.abort();
    setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    setSelectedEntryId((prev) => (prev === entryId ? null : prev));
  }, []);

  const submitSnapshot = useCallback(
    async (version: number, dataUrl: string) => {
      if (lastSubmittedVersionRef.current === version) {
        return;
      }

      if (activeEntryIdRef.current) {
        cancelPending();
      }

      const entryId = nanoid();
      activeEntryIdRef.current = entryId;
      lastSubmittedVersionRef.current = version;

      setEntries((prev) => [
        ...prev,
        {
          id: entryId,
          imageUrl: dataUrl,
          spec: null,
          status: "pending",
          createdAt: Date.now(),
        },
      ]);
      setSelectedEntryId(entryId);

      void streamSpec(entryId, dataUrl);
    },
    [cancelPending, streamSpec]
  );

  const clearHistory = useCallback(() => {
    setEntries([]);
    lastSubmittedVersionRef.current = null;
    activeEntryIdRef.current = null;
    setSelectedEntryId(null);
    abortControllerRef.current?.abort();
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (hasLoadedHistoryRef.current) {
      return;
    }
    hasLoadedHistoryRef.current = true;

    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      const isEntryArray =
        Array.isArray(parsed) &&
        parsed.every(
          (entry) =>
            entry &&
            typeof entry === "object" &&
            typeof (entry as SketchEntry).id === "string" &&
            typeof (entry as SketchEntry).imageUrl === "string"
        );
      if (isEntryArray) {
        const entriesFromStorage = parsed as SketchEntry[];
        setEntries(entriesFromStorage);
        const lastEntry = entriesFromStorage[entriesFromStorage.length - 1];
        if (lastEntry?.id) {
          setSelectedEntryId(lastEntry.id);
        }
      }
    } catch {
      // Ignore corrupted history
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Ignore storage write failures
    }
  }, [entries]);

  const contextValue = useMemo<ProjectContextValue>(
    () => ({
      actions: {
        cancelPending,
        clearHistory,
        setSelectedEntryId,
        submitSnapshot,
      },
      meta: {
        storageKey: STORAGE_KEY,
      },
      state: {
        entries,
        selectedEntryId,
      },
    }),
    [cancelPending, clearHistory, entries, selectedEntryId, submitSnapshot]
  );

  return (
    <ProjectContext.Provider value={contextValue}>
      <main className="grid h-screen grid-cols-1 lg:grid-cols-2">
        {children}
      </main>
    </ProjectContext.Provider>
  );
};

const ProjectWithSlots = Object.assign(Project, {
  Canvas: ProjectCanvas,
  Chat: ProjectChat,
  Panel: ProjectPanel,
});

export default ProjectWithSlots;
