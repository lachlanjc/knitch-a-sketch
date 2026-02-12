import type { UserContent } from "ai";

import { streamText } from "ai";

import { catalog } from "@/lib/catalog";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    prompt,
    context,
  }: {
    prompt?: string;
    context?: { imageDataUrl?: string };
  } = await req.json();

  console.log("[api/chat] prompt:", prompt);
  console.log(
    "[api/chat] imageDataUrl length:",
    context?.imageDataUrl ? context.imageDataUrl.length : 0
  );
  const startTime = Date.now();
  console.log("[api/chat] start", new Date(startTime).toISOString());

  const content: UserContent =
    context?.imageDataUrl
      ? [
          {
            type: "text",
            text:
              prompt ??
              "Generate a knitting pattern UI from the provided sketch.",
          },
          {
            type: "image",
            image: context.imageDataUrl,
          },
        ]
      : prompt ?? "Generate a knitting pattern UI.";

  const result = streamText({
    model: "google/gemini-3-flash",
    system: catalog.prompt({
      system:
        "You are an expert knitter. Generate UI specs for knitting patterns from user sketches.",
      customRules: [
        "Always output JSONL patches using RFC 6902 (SpecStream).",
        "Do not wrap output in markdown or code fences.",
        "Root must be a PatternCarousel element with children array of PieceCard elements.",
        "Each PieceCard represents one knitting piece derived from the sketch.",
        "Start each PieceCard name with a friendly adjective.",
        "Use only components from the catalog.",
        "Include state with any structured data you reference.",
        "Always include a children array on every element (use [] for leaves).",
        "PieceCard.yarnColor must be a 6-digit hex color (e.g. #AABBCC).",
      ],
    }),
    messages: [
      {
        role: "user",
        content,
      },
    ],
  });

  console.log("[api/chat] streaming spec response");
  return result.toTextStreamResponse();
}
