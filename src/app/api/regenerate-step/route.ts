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
- Return ONLY the new step text — no quotes, no explanation`,
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
- Devuelve SOLO el texto del nuevo paso — sin comillas, sin explicación`,
  };

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      systemInstruction: systemInstructions[lang],
    });

    const text = await callGeminiWithRetry(model, userPrompts[lang]);
    // Strip surrounding quotes the model sometimes adds
    const newText = text.trim().replace(/^["']|["']$/g, "");

    if (!newText || newText.length > 500) {
      return NextResponse.json(
        { error: "Invalid AI response. Please try again." },
        { status: 500 }
      );
    }

    const updatedStep = await prisma.taskStep.update({
      where: { id: stepId },
      data: { text: newText },
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
