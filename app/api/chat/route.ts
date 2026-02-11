import { streamText, UIMessage, convertToModelMessages } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    messages,
  }: {
    messages: UIMessage[];
  } = await req.json();

  const result = streamText({
    model: "google/gemini-3-flash",
    messages: await convertToModelMessages(messages),
    system:
      "You are an expert knitter. People send you drawings of things they want to knit, you write a pattern for the simplest way to knit that shape. Respond ONLY with the knitting pattern, no explanations or additional text.",
  });

  // send sources and reasoning back to the client
  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });
}
