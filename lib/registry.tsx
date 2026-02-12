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
  <div className="h-[80vh] overflow-y-auto px-6 py-6 -my-6 flex flex-col">
      {Children.toArray(children).map((child, index) => (
        <div key={(child as { key?: string }).key ?? `piece-${index}`}>
          {child}
        </div>
      ))}
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
  const yarnColor =
    /^#([0-9a-fA-F]{6})$/.test(props.yarnColor) ? props.yarnColor : "#E5E7EB";

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-xl my-4">
      <div className="flex items-center gap-3">
        <h3 className="text-xl font-semibold">{props.name}</h3>
        {quantity !== 1 ? <Badge variant="outline">x{quantity}</Badge> : null}
      </div>
      <div className="-mb-1 -ml-0.5 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
        <span className="flex items-center gap-1">
          <YarnIcon className="size-6" color={yarnColor} />
          {props.yarn}
        </span>
      </div>
      <ul className="mt-4 list-none space-y-2 text-sm text-zinc-800">
        {props.instructions.map((step, index) => {
          if (typeof step === "string") {
            return <li key={`${props.name}-${index}`}>{step}</li>;
          }
          if (step && typeof step === "object") {
            const maybeText = (step as { text?: string }).text;
            const value =
              typeof maybeText === "string"
                ? maybeText
                : JSON.stringify(step);
            return <li key={`${props.name}-${index}`}>{value}</li>;
          }
          return <li key={`${props.name}-${index}`}>{String(step)}</li>;
        })}
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
