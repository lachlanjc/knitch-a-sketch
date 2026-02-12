"use client";

import type { ForwardedRef, HTMLAttributes } from "react";

import Image from "next/image";
import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";
import Icon from "supercons";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Spinner } from "@/components/ui/spinner";

import { useProjectContext } from "./ProjectContext";

interface SketchAttachment {
  id: string;
  imageUrl: string;
}

interface MessageProps {
  attachments: SketchAttachment[];
  selectedId?: string | null;
  pendingId?: string | null;
  onSelect?: (id: string) => void;
  onSelectScroll?: (id: string) => void;
  getItemRef?: (id: string) => (node: HTMLDivElement | null) => void;
}

const Attachment = forwardRef(
  (
    {
      data,
      className,
      children,
      ...props
    }: HTMLAttributes<HTMLDivElement> & { data: SketchAttachment },
    ref: ForwardedRef<HTMLDivElement>
  ) => (
    <div
      className={`group relative size-24 overflow-hidden rounded-lg ${className ?? ""}`}
      data-attachment-id={data.id}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  )
);

const AttachmentPreview = ({ data }: { data: SketchAttachment }) => (
  <Image
    alt="Sketch"
    className="size-full object-cover"
    height={96}
    src={data.imageUrl}
    unoptimized
    width={96}
  />
);

const MessageAttachments = ({
  attachments,
  selectedId,
  pendingId,
  onSelect,
  onSelectScroll,
  getItemRef,
}: MessageProps) => (
  <Carousel
    orientation="horizontal"
    className="w-full"
    opts={{ align: "start", dragFree: true }}
  >
    <CarouselContent className="px-2 -ml-2 gap-3 snap-x snap-mandatory">
      {attachments.map((file) => {
        const isSelected = file.id === selectedId;
        const isPending = file.id === pendingId;
        return (
          <CarouselItem className="basis-auto snap-start" key={file.id}>
            <Attachment
              data={file}
              className={`shrink-0 cursor-pointer border transition ${
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
              {isPending ? (
                <div className="absolute inset-0 grid place-items-center bg-zinc-950/60">
                  <Spinner className="size-4" />
                </div>
              ) : null}
            </Attachment>
          </CarouselItem>
        );
      })}
    </CarouselContent>
  </Carousel>
);

export default function Sketchstrip() {
  const {
    state: { entries, selectedEntryId },
    actions: { clearHistory, setSelectedEntryId },
  } = useProjectContext();
  const filmstripItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const filmstripAttachments = useMemo<SketchAttachment[]>(
    () =>
      entries.map((entry) => ({
        id: entry.id,
        imageUrl: entry.imageUrl,
      })),
    [entries]
  );

  useEffect(() => {
    if (!entries.length && selectedEntryId !== null) {
      setSelectedEntryId(null);
    }
  }, [entries.length, selectedEntryId, setSelectedEntryId]);

  useEffect(() => {
    if (!selectedEntryId) {
      return;
    }
    const node = filmstripItemRefs.current.get(selectedEntryId);
    node?.scrollIntoView({ block: "center", inline: "center" });
  }, [selectedEntryId]);

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
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      if (entries[i]?.status === "pending") {
        return entries[i]?.id ?? null;
      }
    }
    return null;
  }, [entries]);

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
            selectedId={selectedEntryId}
            onSelect={setSelectedEntryId}
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
