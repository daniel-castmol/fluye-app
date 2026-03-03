/**
 * Shared Gemini AI utilities.
 * Single source of truth for the model name, genAI instance,
 * and the retry-wrapper used by all AI route handlers.
 */

import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

/** Gemini model used across all AI routes. Change here to upgrade everywhere. */
export const GEMINI_MODEL = "gemini-flash-latest";

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Calls a Gemini model with automatic retry on transient errors (503, overloaded).
 * Waits 2 s between retries.
 */
export async function callGeminiWithRetry(
  model: GenerativeModel,
  prompt: string,
  retries = 2
): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err: unknown) {
      const isTransient =
        err instanceof Error &&
        (err.message.includes("503") ||
          err.message.includes("overloaded") ||
          err.message.includes("ServiceUnavailable"));
      if (isTransient && attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}
