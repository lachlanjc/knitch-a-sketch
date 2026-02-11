import type { ComponentProps } from "react";

import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";

function Spinner({ className, ...props }: ComponentProps<"svg">) {
  const {
    strokeWidth = 2,
    ...iconProps
  } = props as Omit<ComponentProps<"svg">, "strokeWidth"> & {
    strokeWidth?: number;
  };

  return (
    <HugeiconsIcon
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      icon={Loading03Icon}
      role="status"
      strokeWidth={strokeWidth}
      {...iconProps}
    />
  );
}

export { Spinner };
