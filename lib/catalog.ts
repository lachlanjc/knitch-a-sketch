import { defineCatalog } from "@json-render/core";
import { defineSchema } from "@json-render/core";
import { z } from "zod";

const schema = defineSchema((s) => {
  const optional = <T extends Record<string, unknown>>(type: T) =>
    ({ ...type, ...s.optional() }) as T;

  return {
    spec: s.object({
      root: s.string(),
      elements: s.record(
        s.object({
          type: s.string(),
          props: s.any(),
          children: optional(s.array(s.string())),
          visible: optional(s.any()),
          repeat: optional(
            s.object({
              path: s.string(),
              key: optional(s.string()),
            })
          ),
          on: optional(s.any()),
        })
      ),
      state: optional(s.record(s.any())),
    }),
    catalog: s.object({
      components: s.record(
        s.object({
          props: s.any(),
          slots: optional(s.array(s.string())),
          description: optional(s.string()),
        })
      ),
      actions: s.record(
        s.object({
          params: optional(s.any()),
          description: optional(s.string()),
        })
      ),
    }),
  };
});

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
      description: "Single knitting piece with steps and yarn guidance.",
    },
  },
  actions: {},
});
