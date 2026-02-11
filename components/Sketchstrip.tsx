"use client";

import type { FileUIPart, UIMessage } from "ai";
import type { ForwardedRef, HTMLAttributes, ReactNode } from "react";

import Image from "next/image";
import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";
import Icon from "supercons";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { useProjectContext } from "./ProjectContext";

interface UserEntry {
  id: string;
  file: FileUIPart;
  messageIndex: number;
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

type AttachmentData = FileUIPart & { id: string };

const getFileParts = (parts: UIMessage["parts"]) =>
  parts.filter((part): part is FileUIPart => part.type === "file");

const Attachments = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={className} role="list">
    {children}
  </div>
);

const Attachment = forwardRef(
  (
    {
      data,
      className,
      children,
      onRemove,
      ...props
    }: HTMLAttributes<HTMLDivElement> & {
      data: AttachmentData;
      onRemove?: () => void;
    },
    ref: ForwardedRef<HTMLDivElement>
  ) => (
    <div
      className={`group relative size-24 overflow-hidden rounded-lg ${className ?? ""}`}
      data-attachment-id={data.id}
      data-has-remove={onRemove ? "true" : "false"}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  )
);

const AttachmentPreview = ({ data }: { data: AttachmentData }) => {
  if (data.type !== "file" || !data.url) {
    return (
      <div className="flex size-full items-center justify-center bg-zinc-100 text-xs text-zinc-500">
        File
      </div>
    );
  }

  return (
    <Image
      alt={data.filename ?? "Sketch"}
      className="size-full object-cover"
      height={96}
      src={data.url}
      width={96}
    />
  );
};

const AttachmentRemove = ({ onRemove }: { onRemove?: () => void }) => {
  if (!onRemove) {
    return null;
  }

  return (
    <Button
      aria-label="Remove"
      className="absolute right-2 top-2 size-6 rounded-full bg-white/80 p-0 opacity-0 transition-opacity group-hover:opacity-100"
      onClick={(event) => {
        event.stopPropagation();
        onRemove();
      }}
      type="button"
      variant="ghost"
    >
      x<span className="sr-only">Remove</span>
    </Button>
  );
};

const MessageAttachments = ({
  attachments,
  onRemove,
  selectedId,
  pendingId,
  onSelect,
  onSelectScroll,
  getItemRef,
}: MessageProps) => (
  <Attachments className="flex w-full flex-nowrap gap-3 overflow-x-auto p-2 -ml-2 snap-x snap-mandatory">
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
          <AttachmentPreview data={file} />
          <AttachmentRemove
            onRemove={onRemove ? () => onRemove(file.id) : undefined}
          />
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

export default function Sketchstrip() {
  const {
    state: { messages, selectedUserId },
    actions: { clearHistory, setSelectedUserId },
  } = useProjectContext();
  const lastUserIdRef = useRef<string | null>(null);
  const filmstripItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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
    [messages]
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
  }, [selectedUserId, setSelectedUserId, userEntries]);

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

  const pendingEntryId = useMemo(() => {
    for (let i = userEntries.length - 1; i >= 0; i -= 1) {
      const entry = userEntries[i];
      const hasAssistant = messages
        .slice(entry.messageIndex + 1)
        .some((message) => message?.role === "assistant");
      if (!hasAssistant) {
        return entry.id;
      }
    }
    return null;
  }, [messages, userEntries]);

  if (!filmstripAttachments.length) {
    return null;
  }

  return (
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
          onClick={clearHistory}
          aria-label="Clear history"
        >
          <Icon glyph="view-close-small" size={24} />
        </Button>
      </div>
    </nav>
  );
}
