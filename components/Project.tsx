"use client";

import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";

import { useChat } from "@ai-sdk/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Canvas from "./Canvas";
import Chat from "./Chat";
import {
  ProjectContext,
  type ProjectContextValue,
  useProjectContext,
} from "./ProjectContext";

const STORAGE_KEY = "knitspace.chat.history";

type CanvasProps = ComponentPropsWithoutRef<typeof Canvas>;
type ChatProps = ComponentPropsWithoutRef<typeof Chat>;

type ProjectCanvasProps = Omit<CanvasProps, "onIdle" | "onDrawStart"> & {
  idleMs?: number;
};

type ProjectPanelProps = PropsWithChildren;

type ProjectChatProps = ChatProps;

const ProjectCanvas = ({
  idleMs = 500,
  ...props
}: ProjectCanvasProps) => {
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
    [submitSnapshot],
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
  <section className="p-6 lg:p-10">{children}</section>
);

const ProjectChat = (props: ProjectChatProps) => <Chat {...props} />;

const Project = ({ children }: PropsWithChildren) => {
  const { messages, sendMessage, setMessages, status, stop } = useChat();
  const hasLoadedHistoryRef = useRef(false);
  const lastSubmittedVersionRef = useRef<number | null>(null);
  const submittingRef = useRef(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const submitSnapshot = useCallback(
    async (version: number, dataUrl: string) => {
      if (submittingRef.current) {
        return;
      }

      if (lastSubmittedVersionRef.current === version) {
        return;
      }

      submittingRef.current = true;
      try {
        await sendMessage({
          files: [
            {
              filename: `canvas-${Date.now()}.png`,
              mediaType: "image/png",
              type: "file",
              url: dataUrl,
            },
          ],
        });
        lastSubmittedVersionRef.current = version;
      } finally {
        submittingRef.current = false;
      }
    },
    [sendMessage],
  );

  const cancelPending = useCallback(() => {
    if (status === "ready") {
      return;
    }
    stop();
    setMessages((prev) => {
      const lastUserIndex = [...prev]
        .reverse()
        .findIndex((message) => message.role === "user");
      if (lastUserIndex === -1) {
        return prev;
      }
      const index = prev.length - 1 - lastUserIndex;
      return prev.slice(0, index);
    });
  }, [setMessages, status, stop]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    lastSubmittedVersionRef.current = null;
    setSelectedUserId(null);
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }, [setMessages]);

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
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setMessages(parsed);
      }
    } catch {
      // Ignore corrupted history
    }
  }, [setMessages]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage write failures
    }
  }, [messages]);

  const contextValue = useMemo<ProjectContextValue>(
    () => ({
      state: {
        messages,
        status,
        selectedUserId,
      },
      actions: {
        submitSnapshot,
        cancelPending,
        clearHistory,
        setSelectedUserId,
      },
      meta: {
        storageKey: STORAGE_KEY,
      },
    }),
    [
      cancelPending,
      clearHistory,
      messages,
      selectedUserId,
      status,
      submitSnapshot,
    ],
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
  Panel: ProjectPanel,
  Chat: ProjectChat,
});

export default ProjectWithSlots;
