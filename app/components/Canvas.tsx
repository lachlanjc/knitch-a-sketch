"use client";

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import getStroke from "perfect-freehand";

type Point = [number, number, number];

type Stroke = {
  id: number;
  points: Point[];
};

const STROKE_OPTIONS = {
  size: 8,
  thinning: 0.6,
  smoothing: 0.6,
  streamline: 0.5,
  easing: (t: number) => t,
  start: {
    taper: 2,
    cap: true,
  },
  end: {
    taper: 4,
    cap: true,
  },
  simulatePressure: true,
} as const;

function getSvgPathFromStroke(points: number[][]) {
  if (!points.length) {
    return "";
  }

  const d = points.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...points[0], "Q"] as (string | number)[],
  );

  d.push("Z");
  return d.join(" ");
}

type CanvasProps = {
  className?: string;
};

export type CanvasHandle = {
  getSnapshotDataUrl: () => Promise<string | null>;
};

const Canvas = forwardRef<CanvasHandle, CanvasProps>(({ className }, ref) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [activeStrokeId, setActiveStrokeId] = useState<number | null>(null);

  const getPoint = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) {
      return null;
    }

    return [
      event.clientX - rect.left,
      event.clientY - rect.top,
      event.pressure || 0.5,
    ] as Point;
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (event.button !== 0) {
        return;
      }

      const point = getPoint(event);
      if (!point) {
        return;
      }

      const id = Date.now();
      setStrokes((prev) => [...prev, { id, points: [point] }]);
      setActiveStrokeId(id);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [getPoint],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (activeStrokeId === null) {
        return;
      }

      const point = getPoint(event);
      if (!point) {
        return;
      }

      setStrokes((prev) =>
        prev.map((stroke) =>
          stroke.id === activeStrokeId
            ? { ...stroke, points: [...stroke.points, point] }
            : stroke,
        ),
      );
    },
    [activeStrokeId, getPoint],
  );

  const endStroke = useCallback(() => {
    setActiveStrokeId(null);
  }, []);

  const handleClear = useCallback(() => {
    setStrokes([]);
    setActiveStrokeId(null);
  }, []);

  const getSnapshotDataUrl = useCallback(async () => {
    const svg = svgRef.current;
    if (!svg) {
      return null;
    }

    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return null;
    }

    const cloned = svg.cloneNode(true) as SVGSVGElement;
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    cloned.setAttribute("width", `${width}`);
    cloned.setAttribute("height", `${height}`);
    if (!cloned.getAttribute("xmlns")) {
      cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    if (!cloned.getAttribute("viewBox")) {
      cloned.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }

    const serializer = new XMLSerializer();
    const svgMarkup = serializer.serializeToString(cloned);
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;

    const image = new Image();
    image.decoding = "async";
    image.src = svgUrl;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to load SVG snapshot."));
    });

    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    ctx.scale(dpr, dpr);
    const background = svg.parentElement
      ? getComputedStyle(svg.parentElement).backgroundColor
      : "rgba(0, 0, 0, 0)";
    if (background !== "rgba(0, 0, 0, 0)") {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL("image/png");
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      getSnapshotDataUrl,
    }),
    [getSnapshotDataUrl],
  );

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className ?? ""}`}
    >
      <div className="pointer-events-none absolute left-6 top-6 z-10 max-w-xs text-sm uppercase tracking-[0.25em] text-zinc-400">
        Knitspace
      </div>
      <div className="pointer-events-none absolute left-6 bottom-6 z-10 max-w-xs text-xs text-zinc-400">
        Draw with mouse or touch. Double tap to clear.
      </div>
      <button
        type="button"
        onClick={handleClear}
        className="absolute right-6 top-6 z-10 rounded-full border border-zinc-700 bg-zinc-900/80 px-4 py-2 text-xs uppercase tracking-[0.2em] text-zinc-200 backdrop-blur"
      >
        Clear
      </button>
      <svg
        ref={svgRef}
        className="h-full w-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
        onPointerCancel={endStroke}
        onDoubleClick={handleClear}
        role="img"
        aria-label="Drawing canvas"
      >
        {strokes.map((stroke) => {
          const strokePoints = getStroke(stroke.points, STROKE_OPTIONS);
          const pathData = getSvgPathFromStroke(strokePoints);
          return (
            <path key={stroke.id} d={pathData} fill="black" stroke="none" />
          );
        })}
      </svg>
    </div>
  );
});

Canvas.displayName = "Canvas";

export default Canvas;
