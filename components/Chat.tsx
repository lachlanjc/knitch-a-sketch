"use client";

import type { FileUIPart, UIMessage } from "ai";

import { useCallback, useMemo } from "react";

import { Badge } from "@/components/ui/badge";

import Generating from "./Generating";
import { useProjectContext } from "./ProjectContext";
import YarnIcon from "./YarnIcon";

interface ChatProps {
  className?: string;
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

export default function Chat({ className }: ChatProps) {
  const {
    state: { messages, selectedUserId },
  } = useProjectContext();

  const getTextFromParts = useCallback(
    (parts: UIMessage["parts"]) =>
      parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join(""),
    []
  );

  const getSourcesFromParts = useCallback(
    (parts: UIMessage["parts"]) =>
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
    (parts: UIMessage["parts"]) =>
      parts
        .filter((part) => part.type === "reasoning")
        .map((part) => part.text)
        .join("\n"),
    []
  );

  const getFileParts = useCallback(
    (parts: UIMessage["parts"]) =>
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

  return (
    <div className={className}>
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
            </div>
          ) : (
            <div className="grid min-h-[40vh] place-items-center text-sm text-zinc-400">
              <Generating />
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
