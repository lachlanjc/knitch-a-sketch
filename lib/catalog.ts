import { defineCatalog } from "@json-render/core";
import { defineSchema } from "@json-render/core";
import { z } from "zod";

const schema = defineSchema(
  (s) => ({
    spec: s.object({
      root: s.object({
        type: s.ref("catalog.components"),
        props: s.propsOf("catalog.components"),
        children: s.array(s.any()),
      }),
      state: s.any(),
    }),
    catalog: s.object({
      components: s.map({
        props: s.zod(),
        slots: s.array(s.string()),
        description: s.string(),
      }),
      actions: s.map({
        params: s.zod(),
        description: s.string(),
      }),
    }),
  }),
  {
    promptTemplate: ({ catalog, options, formatZodType }) => {
      const catalogData = catalog as {
        components?: Record<
          string,
          { props?: z.ZodTypeAny; description?: string }
        >;
      };
      const system =
        options?.system ?? "You are a UI generator that outputs JSON.";
      const rules = options?.customRules ?? [];
      const components = Object.entries(catalogData.components ?? {}).map(
        ([name, def]) => {
          const propsSchema = def.props
            ? formatZodType(def.props)
            : "unknown";
          const description = def.description ? ` ${def.description}` : "";
          return `- ${name}: props ${propsSchema}.${description}`;
        }
      );
      return [
        system,
        "",
        "OUTPUT FORMAT (JSONL, RFC 6902 JSON Patch):",
        "Output JSONL (one JSON object per line) using RFC 6902 JSON Patch operations to build a UI tree.",
        "The spec shape is:",
        "{ root: { type, props, children: [] }, state: { ... } }",
        "Use JSON patch paths like /root, /root/children/0, /root/children/1/children/0, /state.",
        "Do NOT wrap output in markdown or code fences.",
        "",
        "AVAILABLE COMPONENTS:",
        ...components,
        "",
        "RULES:",
        ...rules.map((rule) => `- ${rule}`),
      ].join("\n");
    },
  }
);

const yarnColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/)
  .describe("Hex color like #AABBCC");

export const catalog = defineCatalog(schema, {
  components: {
    PatternCarousel: {
      props: z.object({}),
      slots: ["default"],
      description: "Vertical carousel container for knitting piece cards.",
    },
    PieceCard: {
      props: z.object({
        name: z
          .string()
          .describe("Friendly adjective + name, e.g. Shining Star."),
        quantity: z.number().int().positive().optional(),
        yarn: z
          .string()
          .describe('Suggested yarn type in sentence case.'),
        yarnColor: yarnColorSchema.describe("Hex color for yarn."),
        instructions: z.array(z.string()).min(1),
      }),
      slots: ["default"],
      description: "Single knitting piece with steps and yarn guidance.",
    },
  },
  actions: {},
});
