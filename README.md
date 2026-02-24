# Fluye — AI-Powered ADHD Task Translator

> Kill the Paralysis. Slice the Task.

**Live:** https://fluye-app-six.vercel.app
**GitHub:** https://github.com/daniel-castmol/fluye-app

---

## The Problem

People with ADHD (and honestly, everyone) write vague tasks like "Fix the dataset" or "Work on the project" — and then freeze. The task exists but the starting point doesn't. Traditional planners just add more items to an already overwhelming list.

## The Solution

Fluye is a conversational AI task translator. You dump your vague to-dos, Fluye asks 2-3 targeted clarifying questions based on *your* work context, then breaks everything into concrete 5-30 minute steps you can actually start.

It works for technical tasks, personal goals, creative projects, even cooking — because it knows who you are.

---

## How It Works

1. **Sign in** with Google or GitHub
2. **Set up your profile** — tell Fluye your role, your stack, your current projects
3. **Dump your tasks** — as vague as you want
4. **Answer 2-3 questions** — or skip and get a generic breakdown
5. **Get concrete steps** — check them off as you go

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + Shadcn/ui |
| Auth | Supabase Auth (Google + GitHub OAuth) |
| Database | Supabase PostgreSQL + Prisma ORM |
| AI | Google Gemini API |
| Deployment | Vercel |

---

## Architecture

```
Landing Page → Auth (Supabase OAuth) → Profile Setup → Main App
                                                           │
                                            ┌──────────────┼──────────────┐
                                            │              │              │
                                       /api/clarify  /api/breakdown  /api/tasks
                                            │              │              │
                                        Gemini API    Gemini API    PostgreSQL
```

**API Routes:**
- `POST /api/clarify` — generates contextual clarifying questions
- `POST /api/breakdown` — breaks tasks into concrete steps using user profile + answers
- `GET|DELETE /api/tasks` — fetch and archive all tasks
- `DELETE /api/tasks/[taskId]` — archive a single task
- `PATCH /api/tasks/[taskId]/steps/[stepId]` — toggle step completion

---

## Running Locally

```bash
git clone https://github.com/daniel-castmol/fluye-app.git
cd fluye-app
npm install
```

Create a `.env` file with:
```env
DATABASE_URL=your_supabase_postgres_url
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

```bash
npm run dev
```

---

## Built for the Vibe Coding Hackathon 2026 — by Daniel Castillo (solo)
