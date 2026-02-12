"use client";

import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";

import { useUIStream } from "@json-render/react";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ProjectContextValue, SketchEntry } from "./ProjectContext";

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

  const { spec, send, clear } = useUIStream({
    api: "/api/chat",
    onComplete: (finalSpec) => {
      console.log("[ui] spec complete", finalSpec);
      const entryId = activeEntryIdRef.current;
      if (!entryId) {
        return;
      }
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? { ...entry, spec: finalSpec, status: "ready" }
            : entry
        )
      );
      setSelectedEntryId(entryId);
      activeEntryIdRef.current = null;
    },
    onError: () => {
      console.log("[ui] spec error");
      const entryId = activeEntryIdRef.current;
      if (!entryId) {
        return;
      }
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, status: "error" } : entry
        )
      );
      activeEntryIdRef.current = null;
    },
  });

  const cancelPending = useCallback(() => {
    const entryId = activeEntryIdRef.current;
    if (!entryId) {
      return;
    }
    activeEntryIdRef.current = null;
    clear();
    setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    setSelectedEntryId((prev) => (prev === entryId ? null : prev));
  }, [clear]);

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
      setSelectedEntryId((prev) => (prev ? prev : entryId));

      void send("Generate a knitting pattern UI for this sketch.", {
        imageDataUrl: dataUrl,
      });
    },
    [cancelPending, send]
  );

  const clearHistory = useCallback(() => {
    setEntries([]);
    lastSubmittedVersionRef.current = null;
    activeEntryIdRef.current = null;
    setSelectedEntryId(null);
    clear();
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }, [clear]);

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

  useEffect(() => {
    const entryId = activeEntryIdRef.current;
    if (!entryId || !spec) {
      return;
    }
    console.log("[ui] spec patch", spec);
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId ? { ...entry, spec, status: "pending" } : entry
      )
    );
  }, [spec]);

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
