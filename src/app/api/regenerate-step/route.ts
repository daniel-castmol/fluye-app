import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { genAI, GEMINI_MODEL, callGeminiWithRetry } from "@/lib/gemini";
import { SchemaType, Schema } from "@google/generative-ai";
import { z } from "zod";

const regenerateStepSchema: Schema = {
  description: "A single regenerated task step",
  type: SchemaType.OBJECT,
  properties: {
    text: {
      type: SchemaType.STRING,
      description: "Specific actionable step",
    },
    duration_estimate: {
      type: SchemaType.STRING,
      description: "Time estimate (e.g., '10m', '25m')",
    },
  },
  required: ["text", "duration_estimate"],
};

const RegenerateResponseSchema = z.object({
  text: z.string().min(5).max(500),
  duration_estimate: z.string().min(2).max(20),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { stepId, taskId } = body;

  if (!stepId || typeof stepId !== "string") {
    return NextResponse.json({ error: "Invalid stepId" }, { status: 400 });
  }
  if (!taskId || typeof taskId !== "string") {
    return NextResponse.json({ error: "Invalid taskId" }, { status: 400 });
  }

  // Fetch the step with task + profile for ownership check and AI context
  const step = await prisma.taskStep.findUnique({
    where: { id: stepId },
    include: {
      task: {
        include: {
          profile: true,
          steps: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  if (!step || step.taskId !== taskId) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  // Verify the requesting user owns this task
  if (step.task.profile.userId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { task } = step;
  const profile = task.profile;
  const lang = profile.preferredLanguage === "es" ? "es" : "en";

  // Parse clarification Q&A for richer context
  let clarificationContext = "";
  try {
    const parsed = JSON.parse(task.clarification || "{}");
    if (parsed.questions && parsed.answers) {
      clarificationContext = (parsed.questions as string[])
        .map((q: string, i: number) => `Q: ${q}\nA: ${parsed.answers[i] || "No answer"}`)
        .join("\n\n");
    }
  } catch {
    // malformed clarification — proceed without context
  }

  // Provide all sibling steps so the regenerated step doesn't duplicate them
  const allSteps = task.steps
    .map((s, i) => `${i + 1}. ${s.text}`)
    .join("\n");

  const systemInstructions = {
    en: `You are a task breakdown assistant for people with ADHD. You are precise, empathetic, and action-oriented.

User context:
- Name: ${profile.name}
- Role: ${profile.roleWork || "Not specified"}
- Projects: ${profile.projects || "Not specified"}`,
    es: `Eres un asistente de descomposición de tareas para personas con TDAH. Eres preciso, empático y orientado a la acción.
IMPORTANTE: Escribe siempre en español correcto con todos los acentos y tildes (á, é, í, ó, ú, ñ, ü). Nunca omitas ni reemplaces caracteres acentuados.

Contexto del usuario:
- Nombre: ${profile.name}
- Rol: ${profile.roleWork || "No especificado"}
- Proyectos: ${profile.projects || "No especificado"}`,
  };

  const userPrompts = {
    en: `Rewrite the following step to be clearer, more specific, and more actionable.

Task: "${task.originalText}"
${clarificationContext ? `\nContext:\n${clarificationContext}` : ""}

All steps (for context — do NOT repeat them):
${allSteps}

Step to rewrite (step ${step.order + 1}): "${step.text}"

Rules:
- Start with an actionable verb
- Be specific and concrete (avoid vague language)
- Should be completable in 5–30 minutes
- Single step only (no sub-bullets or multiple sentences)
- Provide a duration estimate (e.g., '10m', '25m')`,
    es: `Reescribe el siguiente paso para que sea más claro, específico y accionable.

Tarea: "${task.originalText}"
${clarificationContext ? `\nContexto:\n${clarificationContext}` : ""}

Todos los pasos (para contexto — NO los repitas):
${allSteps}

Paso a reescribir (paso ${step.order + 1}): "${step.text}"

Reglas:
- Comienza con un verbo de acción
- Sé específico y concreto (evita lenguaje vago)
- Debe ser completable en 5–30 minutos
- Un solo paso (sin sub-puntos ni varias oraciones)
- Proporciona una estimación de duración (ej., '10m', '25m')`,
  };

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemInstructions[lang],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: regenerateStepSchema,
      },
    });

    const text = await callGeminiWithRetry(model, userPrompts[lang]);

    const result = RegenerateResponseSchema.safeParse(JSON.parse(text));
    if (!result.success) {
      console.warn("[regenerate-step] Zod validation failed:", result.error.issues);
      return NextResponse.json(
        { error: "AI response was malformed. Please try again." },
        { status: 500 }
      );
    }

    const { text: newText, duration_estimate } = result.data;

    const updatedStep = await prisma.taskStep.update({
      where: { id: stepId },
      data: {
        text: newText,
        durationEstimate: duration_estimate,
      },
    });

    return NextResponse.json({ step: updatedStep });
  } catch (err) {
    console.error("[regenerate-step] Gemini error:", err);
    return NextResponse.json(
      { error: "Failed to regenerate step. Please try again." },
      { status: 500 }
    );
  }
}
