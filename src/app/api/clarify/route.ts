import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { isNewDay } from "@/lib/utils";
import { ClarifyResponseSchema } from "@/lib/schemas";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function callGeminiWithRetry(
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

const CLARIFY_FALLBACK_QUESTIONS = [
  "What specific outcome are you trying to achieve?",
  "What's the first thing that comes to mind when you think about starting?",
  "Are there any blockers or dependencies?",
];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { taskInput } = body;

  if (!taskInput || typeof taskInput !== "string" || taskInput.length > 2000) {
    return NextResponse.json({ error: "Invalid task input" }, { status: 400 });
  }

  // Load profile for context and rate limiting
  let profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Profile not found. Please complete setup." },
      { status: 404 }
    );
  }

  // Reset clarify counter if it's a new day (UTC)
  if (isNewDay(profile.lastClarifyReset)) {
    profile = await prisma.userProfile.update({
      where: { id: profile.id },
      data: {
        clarifyRequestsToday: 0,
        lastClarifyReset: new Date(),
      },
    });
  }

  // Enforce daily limit: 20/day free, 1000/day pro
  const limit = profile.subscriptionStatus === "pro" ? 1000 : 20;
  if (profile.clarifyRequestsToday >= limit) {
    return NextResponse.json(
      {
        error:
          profile.subscriptionStatus === "free"
            ? "Daily clarify limit reached (20/day). Upgrade to Pro for unlimited requests."
            : "Daily clarify limit reached.",
      },
      { status: 429 }
    );
  }

  const contextInfo = `User context: ${profile.name}. Role: ${profile.roleWork || "Not specified"}. Current projects: ${profile.projects || "Not specified"}.`;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      systemInstruction: `You help people with ADHD break down vague tasks into concrete steps. You are empathetic but efficient. ${contextInfo}`,
    });

    const text = await callGeminiWithRetry(
      model,
      `I need to do the following:\n\n"${taskInput}"\n\nGenerate 2-3 short, specific clarifying questions to help me break this down better. Questions should be about specific problems, goals, or constraints. Keep questions concise.\n\nReturn ONLY valid JSON: { "questions": ["question1", "question2", "question3"] }`
    );

    // Increment counter regardless of parse outcome (the AI was called)
    await prisma.userProfile.update({
      where: { id: profile.id },
      data: { clarifyRequestsToday: { increment: 1 } },
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[clarify] No JSON found in AI response, using fallback");
      return NextResponse.json({ questions: CLARIFY_FALLBACK_QUESTIONS });
    }

    const result = ClarifyResponseSchema.safeParse(JSON.parse(jsonMatch[0]));
    if (!result.success) {
      console.warn("[clarify] Zod validation failed:", result.error.issues);
      return NextResponse.json({ questions: CLARIFY_FALLBACK_QUESTIONS });
    }

    return NextResponse.json({ questions: result.data.questions });
  } catch (err) {
    console.error("[clarify] Gemini error:", err);
    return NextResponse.json({ questions: CLARIFY_FALLBACK_QUESTIONS });
  }
}
