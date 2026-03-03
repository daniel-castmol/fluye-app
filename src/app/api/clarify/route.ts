import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isNewDay } from "@/lib/utils";
import { ClarifyResponseSchema } from "@/lib/schemas";
import { genAI, GEMINI_MODEL, callGeminiWithRetry } from "@/lib/gemini";

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

  const lang = profile.preferredLanguage === "es" ? "es" : "en";

  // Language-aware system prompts and user prompts
  const systemInstructions = {
    en: `You help people with ADHD break down vague tasks into concrete steps. You are empathetic but efficient. User context: ${profile.name}. Role: ${profile.roleWork || "Not specified"}. Current projects: ${profile.projects || "Not specified"}.`,
    es: `Ayudas a personas con TDAH a descomponer tareas vagas en pasos concretos. Eres empático pero eficiente. Contexto del usuario: ${profile.name}. Rol: ${profile.roleWork || "No especificado"}. Proyectos actuales: ${profile.projects || "No especificado"}.`,
  };
  const userPrompts = {
    en: `I need to do the following:\n\n"${taskInput}"\n\nGenerate 2-3 short, specific clarifying questions to help me break this down better. Questions should be about specific problems, goals, or constraints. Keep questions concise.\n\nReturn ONLY valid JSON: { "questions": ["question1", "question2", "question3"] }`,
    es: `Necesito hacer lo siguiente:\n\n"${taskInput}"\n\nGenera 2-3 preguntas cortas y específicas para ayudarme a desglosar esto mejor. Las preguntas deben ser sobre problemas, objetivos o restricciones específicas. Mantén las preguntas concisas.\n\nDevuelve SOLO JSON válido: { "questions": ["pregunta1", "pregunta2", "pregunta3"] }`,
  };

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemInstructions[lang],
    });

    const text = await callGeminiWithRetry(model, userPrompts[lang]);

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
