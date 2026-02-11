"use client";

import type { FileUIPart, UIMessage, UIMessagePart } from "ai";

import { useChat } from "@ai-sdk/react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Icon from "supercons";

import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import Generating from "./Generating";
import YarnIcon from "./YarnIcon";

interface ChatProps {
  getCanvasSnapshot?: () => Promise<string | null>;
}

export interface ChatHandle {
  submitCanvasSnapshot: () => Promise<void>;
  cancelPending: () => void;
}

interface UserEntry {
  id: string;
  file: FileUIPart;
  messageIndex: number;
}

interface Piece {
  name: string;
  quanity?: number;
  yarn: string;
  yarnColor: string;
  instructions: string[];
}

interface Pattern {
  pieces: Piece[];
}

interface MessageProps {
  attachments: (FileUIPart & { id: string })[];
  onRemove?: (id: string) => void;
  selectedId?: string | null;
  pendingId?: string | null;
  onSelect?: (id: string) => void;
  onSelectScroll?: (id: string) => void;
  getItemRef?: (id: string) => (node: HTMLDivElement | null) => void;
}

const MessageAttachments = ({
  attachments,
  onRemove,
  selectedId,
  pendingId,
  onSelect,
  onSelectScroll,
  getItemRef,
}: MessageProps) => (
  <Attachments
    variant="grid"
    className="p-2 -ml-2 w-full flex-nowrap gap-3 overflow-x-auto snap-x snap-mandatory"
  >
    {attachments.map((file) => {
      const isSelected = file.id === selectedId;
      const isPending = file.id === pendingId;
      return (
        <Attachment
          key={file.id}
          data={file}
          onRemove={onRemove ? () => onRemove(file.id) : undefined}
          className={`shrink-0 cursor-pointer snap-start border transition ${
            isSelected
              ? "border-black ring-4 ring-black"
              : "border-transparent hover:border-zinc-600"
          }`}
          onClick={
            onSelect || onSelectScroll
              ? () => {
                  onSelect?.(file.id);
                  onSelectScroll?.(file.id);
                }
              : undefined
          }
          ref={getItemRef ? getItemRef(file.id) : undefined}
        >
          <AttachmentPreview />
          <AttachmentRemove />
          {isPending ? (
            <div className="absolute inset-0 grid place-items-center bg-zinc-950/60">
              <Spinner className="size-4" />
            </div>
          ) : null}
        </Attachment>
      );
    })}
  </Attachments>
);

const Chat = forwardRef<ChatHandle, ChatProps>(({ getCanvasSnapshot }, ref) => {
  const { messages, sendMessage, setMessages, status, stop } = useChat();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const lastUserIdRef = useRef<string | null>(null);
  const filmstripItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const hasLoadedHistoryRef = useRef(false);
  const storageKey = "knitspace.chat.history";

  const submitCanvasSnapshot = useCallback(async () => {
    if (!getCanvasSnapshot || status === "streaming") {
      return;
    }

    let snapshotUrl: string | null = null;
    try {
      snapshotUrl = await getCanvasSnapshot();
    } catch {
      snapshotUrl = null;
    }

    if (!snapshotUrl) {
      return;
    }

    const file: FileUIPart = {
      filename: `canvas-${Date.now()}.png`,
      mediaType: "image/png",
      type: "file",
      url: snapshotUrl,
    };

    await sendMessage({ files: [file] });
  }, [getCanvasSnapshot, sendMessage, status]);

  useImperativeHandle(
    ref,
    () => ({
      cancelPending: () => {
        if (status === "ready") {
          return;
        }
        stop();
        setMessages((prev) => {
          const lastUserIndex = [...prev]
            .toReversed()
            .findIndex((message) => message.role === "user");
          if (lastUserIndex === -1) {
            return prev;
          }
          const index = prev.length - 1 - lastUserIndex;
          return prev.slice(0, index);
        });
        setSelectedUserId(null);
        lastUserIdRef.current = null;
      },
      submitCanvasSnapshot,
    }),
    [setMessages, status, stop, submitCanvasSnapshot]
  );

  const handleClearHistory = useCallback(() => {
    setMessages([]);
    setSelectedUserId(null);
    lastUserIdRef.current = null;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // Ignore storage errors
      }
    }
  }, [setMessages, storageKey]);

  useEffect(() => {
    if (hasLoadedHistoryRef.current) {
      return;
    }
    hasLoadedHistoryRef.current = true;

    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
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
      window.localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // Ignore storage write failures
    }
  }, [messages]);

  const getTextFromParts = useCallback(
    (parts: UIMessagePart[]) =>
      parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join(""),
    []
  );

  const getSourcesFromParts = useCallback(
    (parts: UIMessagePart[]) =>
      parts
        .filter((part) => part.type === "source-url")
        .map((part) => ({
          href: part.url,
          id: part.sourceId,
          title: part.title ?? part.url,
        })),
    []
  );

  const getReasoningFromParts = useCallback(
    (parts: UIMessagePart[]) =>
      parts
        .filter((part) => part.type === "reasoning")
        .map((part) => part.text)
        .join("\n"),
    []
  );

  const getFileParts = useCallback(
    (parts: UIMessagePart[]) =>
      parts.filter((part): part is FileUIPart => part.type === "file"),
    []
  );

  const userEntries = useMemo<UserEntry[]>(
    () =>
      messages
        .map((message: UIMessage, index) => {
          if (message.role !== "user") {
            return null;
          }
          const files = getFileParts(message.parts);
          const firstFile = files[0];
          if (!firstFile) {
            return null;
          }
          return {
            file: firstFile,
            id: message.id,
            messageIndex: index,
          };
        })
        .filter((entry): entry is UserEntry => Boolean(entry)),
    [getFileParts, messages]
  );

  const filmstripAttachments = useMemo(
    () =>
      userEntries.map((entry) => ({
        ...entry.file,
        id: entry.id,
      })),
    [userEntries]
  );

  useEffect(() => {
    if (!userEntries.length) {
      if (selectedUserId !== null) {
        setSelectedUserId(null);
      }
      lastUserIdRef.current = null;
      return;
    }

    const latestId = userEntries.at(-1)?.id ?? null;
    if (latestId && latestId !== lastUserIdRef.current) {
      lastUserIdRef.current = latestId;
      setSelectedUserId(latestId);
      const node = filmstripItemRefs.current.get(latestId);
      node?.scrollIntoView({ block: "center", inline: "center" });
    }
  }, [selectedUserId, userEntries]);

  const handleFilmstripSelect = useCallback((id: string) => {
    const node = filmstripItemRefs.current.get(id);
    node?.scrollIntoView({ block: "center", inline: "center" });
  }, []);

  const getFilmstripItemRef = useCallback(
    (id: string) => (node: HTMLDivElement | null) => {
      if (node) {
        filmstripItemRefs.current.set(id, node);
      } else {
        filmstripItemRefs.current.delete(id);
      }
    },
    []
  );

  const selectedEntry = useMemo(() => {
    if (!selectedUserId) {
      return null;
    }
    return userEntries.find((entry) => entry.id === selectedUserId) ?? null;
  }, [selectedUserId, userEntries]);

  const getAssistantMessageForEntry = useCallback(
    (entry: UserEntry | null) => {
      if (!entry) {
        return null;
      }
      for (let i = entry.messageIndex + 1; i < messages.length; i += 1) {
        const message = messages[i];
        if (message?.role === "assistant") {
          return message;
        }
      }
      return null;
    },
    [messages]
  );

  const selectedAssistant = useMemo(
    () => getAssistantMessageForEntry(selectedEntry),
    [getAssistantMessageForEntry, selectedEntry]
  );

  const pendingEntryId = useMemo(() => {
    for (let i = userEntries.length - 1; i >= 0; i -= 1) {
      const entry = userEntries[i];
      if (!getAssistantMessageForEntry(entry)) {
        return entry.id;
      }
    }
    return null;
  }, [getAssistantMessageForEntry, userEntries]);

  const selectedAssistantText = useMemo(() => {
    if (!selectedAssistant) {
      return "";
    }
    return getTextFromParts(selectedAssistant.parts);
  }, [getTextFromParts, selectedAssistant]);

  const parsedPattern = useMemo<Pattern | null>(() => {
    if (!selectedAssistantText) {
      return null;
    }
    try {
      const parsed = JSON.parse(selectedAssistantText) as Pattern;
      if (!parsed || !Array.isArray(parsed.pieces)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, [selectedAssistantText]);

  const selectedAssistantSources = useMemo(() => {
    if (!selectedAssistant) {
      return [];
    }
    return getSourcesFromParts(selectedAssistant.parts);
  }, [getSourcesFromParts, selectedAssistant]);

  const selectedAssistantReasoning = useMemo(() => {
    if (!selectedAssistant) {
      return "";
    }
    return getReasoningFromParts(selectedAssistant.parts);
  }, [getReasoningFromParts, selectedAssistant]);

  const selectedAssistantFiles = useMemo(() => {
    if (!selectedAssistant) {
      return [];
    }
    return getFileParts(selectedAssistant.parts);
  }, [getFileParts, selectedAssistant]);

  const isSelectedPending =
    selectedEntry && pendingEntryId === selectedEntry.id;

  return (
    <>
      <div>
        {selectedEntry ? (
          selectedAssistant ? (
            <div>
              {parsedPattern ? (
                <div className="flex flex-col h-full gap-6 overflow-y-auto snap-y snap-mandatory px-6 py-6 -my-6 max-h-[75vb]">
                  {parsedPattern.pieces.map((piece, index) => {
                    const quantity =
                      typeof piece.quanity === "number" ? piece.quanity : 1;
                    return (
                      <section
                        key={`${piece.name}-${index}`}
                        className="rounded-2xl snap-start border border-zinc-200 bg-white p-4 text-zinc-900 shadow-xl"
                      >
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-semibold">
                            {piece.name}
                          </h3>
                          {quantity !== 1 ? (
                            <Badge variant="outline">x{quantity}</Badge>
                          ) : null}
                        </div>
                        <div className="-mb-1 -ml-0.5 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                          <span className="flex items-center gap-1">
                            <YarnIcon
                              className="size-6"
                              color={piece.yarnColor}
                            />
                            {piece.yarn}
                          </span>
                        </div>
                        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-800">
                          {piece.instructions.map((step, stepIndex) => (
                            <li key={`${piece.name}-${stepIndex}`}>{step}</li>
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              ) : null}
              {selectedAssistantFiles.length ? (
                <Attachments className="mt-2" variant="inline">
                  {selectedAssistantFiles.map((attachment, index) => {
                    const id = `${selectedAssistant.id}-${index}`;
                    return (
                      <Attachment data={{ ...attachment, id }} key={id}>
                        <AttachmentPreview />
                        <AttachmentInfo />
                      </Attachment>
                    );
                  })}
                </Attachments>
              ) : null}
            </div>
          ) : (
            <div className="grid min-h-[40vh] place-items-center text-sm text-zinc-400">
              {isSelectedPending ? (
                <Generating />
              ) : (
                "Select a sketch to view its response."
              )}
            </div>
          )
        ) : (
          <div className="grid min-h-[40vh] place-items-center text-sm text-zinc-400">
            Draw to begin.
          </div>
        )}
      </div>
      {filmstripAttachments.length ? (
        <nav className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center">
          <div className="pointer-events-auto flex w-full max-w-5xl items-center gap-3 px-4">
            <div className="min-w-0 flex-1">
              <MessageAttachments
                attachments={filmstripAttachments}
                pendingId={pendingEntryId}
                selectedId={selectedUserId}
                onSelect={setSelectedUserId}
                onSelectScroll={handleFilmstripSelect}
                getItemRef={getFilmstripItemRef}
              />
            </div>
            <Button
              type="button"
              size="icon-lg"
              variant="ghost"
              className="shrink-0 bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur"
              onClick={handleClearHistory}
              aria-label="Clear history"
            >
              <Icon glyph="view-close-small" size={24} />
            </Button>
          </div>
        </nav>
      ) : null}
    </>
  );
});

Chat.displayName = "Chat";

export default Chat;
