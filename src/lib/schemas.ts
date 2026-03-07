import { z } from "zod"

/**
 * Validation schemas for AI responses.
 * These guard against malformed JSON from Gemini and provide type safety.
 */

export const ClarifyResponseSchema = z.object({
  questions: z
    .array(z.string().min(5).max(300))
    .min(1)
    .max(5),
})

export const BreakdownResponseSchema = z.object({
  tasks: z
    .array(
      z.object({
        original: z.string().min(1).max(500),
        context: z.string().min(1).max(1000),
        steps: z
          .array(
            z.object({
              text: z.string().min(5).max(500),
              duration_estimate: z.string().min(2).max(20), // e.g., "10m", "25m"
            })
          )
          .min(1)
          .max(8),
      })
    )
    .min(1),
})

export type ClarifyResponse = z.infer<typeof ClarifyResponseSchema>
export type BreakdownResponse = z.infer<typeof BreakdownResponseSchema>
