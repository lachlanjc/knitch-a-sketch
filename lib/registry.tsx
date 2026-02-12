"use client";

import { Children, type ReactNode } from "react";

import { defineRegistry } from "@json-render/react";

import { Badge } from "@/components/ui/badge";
import YarnIcon from "@/components/YarnIcon";

import { catalog } from "./catalog";

const PatternCarousel = ({
  children,
}: {
  children?: ReactNode;
  props: Record<string, unknown>;
}) => (
  <div className="h-[80vh] overflow-y-auto px-6 py-6 -my-6">
    <div className="flex flex-col gap-6">
      {Children.toArray(children).map((child, index) => (
        <div key={(child as { key?: string }).key ?? `piece-${index}`}>
          {child}
        </div>
      ))}
    </div>
  </div>
);

const PieceCard = ({
  props,
}: {
  props: {
    name: string;
    quantity?: number;
    yarn: string;
    yarnColor: string;
    instructions: string[];
  };
}) => {
  const quantity = props.quantity ?? 1;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-xl my-6">
      <div className="flex items-center gap-3">
        <h3 className="text-xl font-semibold">{props.name}</h3>
        {quantity !== 1 ? <Badge variant="outline">x{quantity}</Badge> : null}
      </div>
      <div className="-mb-1 -ml-0.5 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
        <span className="flex items-center gap-1">
          <YarnIcon className="size-6" color={props.yarnColor} />
          {props.yarn}
        </span>
      </div>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-800">
        {props.instructions.map((step, index) => (
          <li key={`${props.name}-${index}`}>{step}</li>
        ))}
      </ul>
    </section>
  );
};

export const { registry } = defineRegistry(catalog, {
  components: {
    PatternCarousel,
    PieceCard,
  },
});
