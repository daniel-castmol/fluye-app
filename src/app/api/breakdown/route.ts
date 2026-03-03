import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { isNewDay } from "@/lib/utils";
import { BreakdownResponseSchema } from "@/lib/schemas";

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
  const { taskInput, questions, answers, skipClarification } = body;

  if (!taskInput || typeof taskInput !== "string" || taskInput.length > 2000) {
    return NextResponse.json({ error: "Invalid task input" }, { status: 400 });
  }

  if (answers && Array.isArray(answers)) {
    const tooLong = answers.some(
      (a: unknown) => typeof a === "string" && a.length > 500
    );
    if (tooLong) {
      return NextResponse.json({ error: "Answer too long" }, { status: 400 });
    }
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Profile not found. Please complete setup." },
      { status: 400 }
    );
  }

  // Reset breakdown counter if it's a new day (UTC)
  let currentCount = profile.taskBreakdownsToday;
  if (isNewDay(profile.lastBreakdownReset)) {
    currentCount = 0;
    await prisma.userProfile.update({
      where: { id: profile.id },
      data: { taskBreakdownsToday: 0, lastBreakdownReset: new Date() },
    });
  }

  // Enforce daily limit: 10/day free, 999999/day pro
  if (profile.subscriptionStatus === "free" && currentCount >= 10) {
    return NextResponse.json(
      { error: "Daily limit reached (10/day). Upgrade to Pro for unlimited breakdowns." },
      { status: 429 }
    );
  }

  let clarificationContext = "";
  if (!skipClarification && questions && answers) {
    clarificationContext = questions
      .map(
        (q: string, i: number) =>
          `Q: ${q}\nA: ${answers[i] || "No answer provided"}`
      )
      .join("\n\n");
  }

  const lang = profile.preferredLanguage === "es" ? "es" : "en";

  // Language-aware system prompts and user prompts
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

  const clarificationLabel = lang === "es" ? "Aclaraciones" : "Clarifications";
  const noClarificationLabel = lang === "es"
    ? "Sin aclaración proporcionada - usa tu mejor criterio."
    : "No clarification provided - use your best judgment.";

  const userPrompts = {
    en: `Break down the following tasks into concrete, achievable steps.

Original tasks:
"${taskInput}"

${clarificationContext ? `Clarifications:\n${clarificationContext}` : noClarificationLabel}

Rules:
- Each step must start with an actionable verb and include specific detail
- Each step should be completable in 5-30 minutes
- Use the user's technical context when relevant
- Order steps logically
- 3-5 steps per task

Return ONLY valid JSON:
{
  "tasks": [
    {
      "original": "original task text",
      "context": "what you understood about this task",
      "steps": ["step 1", "step 2", "step 3"]
    }
  ]
}`,
    es: `Descompón las siguientes tareas en pasos concretos y alcanzables.

Tareas originales:
"${taskInput}"

${clarificationContext ? `${clarificationLabel}:\n${clarificationContext}` : noClarificationLabel}

Reglas:
- Cada paso debe comenzar con un verbo de acción e incluir un detalle específico
- Cada paso debe ser completable en 5-30 minutos
- Usa el contexto técnico del usuario cuando sea relevante
- Ordena los pasos lógicamente
- 3-5 pasos por tarea

Devuelve SOLO JSON válido:
{
  "tasks": [
    {
      "original": "texto de la tarea original",
      "context": "lo que entendiste sobre esta tarea",
      "steps": ["paso 1", "paso 2", "paso 3"]
    }
  ]
}`,
  };

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      systemInstruction: systemInstructions[lang],
    });

    const text = await callGeminiWithRetry(model, userPrompts[lang]);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 500 }
      );
    }

    // Validate AI response shape with Zod
    const result = BreakdownResponseSchema.safeParse(JSON.parse(jsonMatch[0]));
    if (!result.success) {
      console.warn("[breakdown] Zod validation failed:", result.error.issues);
      return NextResponse.json(
        { error: "AI response was malformed. Please try again." },
        { status: 500 }
      );
    }

    const parsed = result.data;

    const createdTasks = await Promise.all(
      parsed.tasks.map(
        async (task) => {
          const created = await prisma.task.create({
            data: {
              profileId: profile.id,
              originalText: task.original,
              clarification: JSON.stringify({
                context: task.context,
                questions,
                answers,
              }),
              steps: {
                create: task.steps.map((step: string, index: number) => ({
                  text: step,
                  order: index,
                })),
              },
            },
            include: { steps: { orderBy: { order: "asc" } } },
          });
          return created;
        }
      )
    );

    await prisma.userProfile.update({
      where: { id: profile.id },
      data: { taskBreakdownsToday: { increment: 1 } },
    });

    return NextResponse.json({ tasks: createdTasks });
  } catch (err) {
    console.error("[breakdown] Gemini error:", err);
    return NextResponse.json(
      { error: "Failed to break down tasks. Please try again." },
      { status: 500 }
    );
  }
}
