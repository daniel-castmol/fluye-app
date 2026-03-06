import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { genAI, GEMINI_MODEL, callGeminiWithRetry } from "@/lib/gemini";
import { NextResponse } from "next/server";

/**
 * GET /api/example-chips
 * Returns 4 context-aware example task suggestions based on the user's profile.
 * Used by EmptyState to seed the chip list with personalized ideas.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Prefer language from query param (reflects in-session toggle), fall back to profile
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("language") === "es" || profile.preferredLanguage === "es"
    ? "es"
    : "en";

  const profileContext = [
    profile.roleWork ? `Role: ${profile.roleWork}` : null,
    profile.projects ? `Projects: ${profile.projects}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const promptEn = `You are helping a user with ADHD break down their tasks. Based on their profile, generate exactly 4 short, realistic example tasks they might have.

${profileContext ? `User profile:\n${profileContext}` : "No profile info available."}

Requirements:
- Each task should be 5–12 words, concrete but slightly vague (so the AI can help break it down)
- Vary the types: mix work, personal, creative, or technical depending on their role
- Do NOT ask questions — just list the tasks
- Output ONLY a JSON array of 4 strings, nothing else

Example output:
["Set up CI/CD for the backend service", "Write retro slides for Thursday's meeting", "Fix the memory leak in the data pipeline", "Draft email to the client about delays"]`;

  const promptEs = `Estás ayudando a un usuario con TDAH a organizar sus tareas. Basándote en su perfil, genera exactamente 4 tareas cortas y realistas que podría tener.

${profileContext ? `Perfil del usuario:\n${profileContext}` : "Sin información de perfil disponible."}

Requisitos:
- Cada tarea debe tener 5–12 palabras, concreta pero ligeramente vaga (para que la IA pueda ayudar a desglosarla)
- Varía los tipos: mezcla trabajo, personal, creativo o técnico según su rol
- NO hagas preguntas — solo lista las tareas
- Devuelve SOLO un array JSON de 4 strings, nada más

Ejemplo de salida:
["Configurar CI/CD para el servicio backend", "Preparar slides para la reunión del jueves", "Revisar y corregir los tests fallidos", "Redactar email al cliente sobre los retrasos"]`;

  const prompt = lang === "es" ? promptEs : promptEn;

  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const raw = await callGeminiWithRetry(model, prompt);

    // Strip markdown code fences if model wraps the JSON
    const cleaned = raw.replace(/```(?:json)?\n?/g, "").trim();
    const chips = JSON.parse(cleaned) as string[];

    if (!Array.isArray(chips) || chips.length === 0) {
      throw new Error("Invalid chips format");
    }

    return NextResponse.json({ chips: chips.slice(0, 4) });
  } catch {
    // Fall back to generic chips so EmptyState always has something to show
    const fallback = lang === "es"
      ? [
          "Terminar la presentación del proyecto para la próxima semana",
          "Configurar CI/CD para el servicio backend",
          "Preparar slides para la reunión del equipo",
          "Revisar y corregir los tests fallidos",
        ]
      : [
          "Finish the project presentation for next week",
          "Set up CI/CD for the backend service",
          "Prepare slides for the team meeting",
          "Review and fix the failing tests",
        ];
    return NextResponse.json({ chips: fallback });
  }
}
