import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

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

  const profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
  });

  const contextInfo = profile
    ? `User context: ${profile.name}. Role: ${profile.roleWork || "Not specified"}. Current projects: ${profile.projects || "Not specified"}.`
    : "No user context available.";

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      systemInstruction: `You help people with ADHD break down vague tasks into concrete steps. You are empathetic but efficient. ${contextInfo}`,
    });

    const text = await callGeminiWithRetry(
      model,
      `I need to do the following:\n\n"${taskInput}"\n\nGenerate 2-3 short, specific clarifying questions to help me break this down better. Questions should be about specific problems, goals, or constraints. Keep questions concise.\n\nReturn ONLY valid JSON: { "questions": ["question1", "question2", "question3"] }`
    );
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        questions: [
          "What specific outcome are you trying to achieve?",
          "What's the first thing that comes to mind when you think about starting?",
          "Are there any blockers or dependencies?",
        ],
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ questions: parsed.questions });
  } catch (err) {
    console.error("[clarify] Gemini error:", err);
    return NextResponse.json({
      questions: [
        "What specific outcome are you trying to achieve?",
        "What's the first thing that comes to mind when you think about starting?",
        "Are there any blockers or dependencies?",
      ],
    });
  }
}
