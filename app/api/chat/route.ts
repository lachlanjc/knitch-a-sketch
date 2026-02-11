import type { UIMessage} from "ai";
import { streamText, convertToModelMessages, Output } from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const pieceSchema = z.object({
  instructions: z.array(z.string()),
  name: z
    .string()
    .describe(
      "Start with a friendly adjective, e.g. Lucky Star, Special Snowflake, Oscillating Owl"
    ),
  quanity: z.number().int().positive().default(1),
  yarn: z
    .string()
    .describe(
      'Suggested yarn type in sentence case (e.g. "Worsted weight wool" or "Shiny speckled acrylic")'
    ),
  yarnColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .describe("Hex color for suggested yarn."),
});

const patternSchema = z.object({
  pieces: z.array(pieceSchema),
});

export async function POST(req: Request) {
  const {
    messages,
  }: {
    messages: UIMessage[];
  } = await req.json();

  const result = streamText({
    messages: await convertToModelMessages(messages),
    model: "google/gemini-3-flash",
    output: Output.object({
      schema: patternSchema,
      name: "knit_pattern",
      description: "Structured knitting pattern for a drawing.",
    }),
    system:
      "You are an expert knitter. People send you drawings of things they want to knit. Return a structured object that matches the schema, with an array of pieces (oftentimes only 1).",
  });

  // send sources and reasoning back to the client
  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    sendSources: true,
  });
}
