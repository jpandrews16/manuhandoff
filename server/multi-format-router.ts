import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  processMultiFormatInput,
  validateInput,
  getSupportedFormats,
  type MultiFormatInput,
  type InputFormat,
} from "./multi-format";

export const multiFormatRouter = router({
  /**
   * Get supported input formats
   */
  getSupportedFormats: protectedProcedure.query(() => {
    return getSupportedFormats();
  }),

  /**
   * Process multi-format input
   */
  processInput: protectedProcedure
    .input(
      z.object({
        format: z.enum(["text", "image", "audio", "url"] as const),
        content: z.string(),
        metadata: z
          .object({
            filename: z.string().optional(),
            mimeType: z.string().optional(),
            size: z.number().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const multiInput: MultiFormatInput = {
        format: input.format as InputFormat,
        content: input.content,
        metadata: input.metadata,
      };

      // Validate input
      const validation = validateInput(multiInput);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Process input
      const processed = await processMultiFormatInput(multiInput);
      return processed;
    }),

  /**
   * Validate input format
   */
  validateInput: protectedProcedure
    .input(
      z.object({
        format: z.enum(["text", "image", "audio", "url"] as const),
        content: z.string(),
      })
    )
    .query(({ input }) => {
      const validation = validateInput({
        format: input.format as InputFormat,
        content: input.content,
      });
      return validation;
    }),
});
