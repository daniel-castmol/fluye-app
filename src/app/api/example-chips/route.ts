import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { genAI, GEMINI_MODEL, callGeminiWithRetry } from "@/lib/gemini";
import { NextResponse } from "next/server";

/**
 * GET /api/example-chips
 * Returns 4 context-aware example task suggestions based on the user's profile.
 * Used by EmptyState to seed the chip list with personalized ideas.
 */
export async function GET() {
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

  const profileContext = [
    profile.roleWork ? `Role: ${profile.roleWork}` : null,
    profile.projects ? `Projects: ${profile.projects}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `You are helping a user with ADHD break down their tasks. Based on their profile, generate exactly 4 short, realistic example tasks they might have.

${profileContext ? `User profile:\n${profileContext}` : "No profile info available."}

Requirements:
- Each task should be 5–12 words, concrete but slightly vague (so the AI can help break it down)
- Vary the types: mix work, personal, creative, or technical depending on their role
- Do NOT ask questions — just list the tasks
- Output ONLY a JSON array of 4 strings, nothing else

Example output:
["Set up CI/CD for the backend service", "Write retro slides for Thursday's meeting", "Fix the memory leak in the data pipeline", "Draft email to the client about delays"]`;

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
    return NextResponse.json({
      chips: [
        "Write a blog post about our new product launch",
        "Set up CI/CD for the backend microservice",
        "Prepare slides for the team retrospective",
        "Debug the memory leak in the data pipeline",
      ],
    });
  }
}
