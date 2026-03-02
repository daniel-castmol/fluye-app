# Fluye — Route Manifest

## Public Pages

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Landing page with hero, value prop, CTA |
| GET | `/login` | OAuth sign-in (Google + GitHub) |
| GET | `/auth/callback` | Supabase OAuth redirect handler |

## Protected App Pages (requires auth)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/app` | Main app — task input, clarification, task list |
| GET | `/profile-setup` | First-time user profile setup (name, role, projects) |

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/clarify` | Generate 2-3 clarifying questions from vague task input. Rate limited: 20 req/hour/user. |
| POST | `/api/breakdown` | Break tasks into concrete steps using user profile + clarification answers. Rate limited: 10 req/day/user (free tier). |
| GET | `/api/tasks` | Fetch all active tasks with steps for the authenticated user |
| DELETE | `/api/tasks` | Soft-delete (archive) all active tasks for the user |
| DELETE | `/api/tasks/:taskId` | Soft-delete a single task by ID |
| PATCH | `/api/tasks/:taskId/steps/:stepId` | Toggle step completion (true/false). Auto-marks parent task complete when all steps done. |
| GET | `/api/profile` | Get the authenticated user's profile |
| POST | `/api/profile` | Create or update user profile (upsert) |

## Directory Structure

```
fluye-webapp/
├── src/
│   ├── app/
│   │   ├── page.tsx                          ← GET /
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── login/
│   │   │   └── page.tsx                      ← GET /login
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts                  ← GET /auth/callback
│   │   ├── app/
│   │   │   ├── page.tsx                      ← GET /app
│   │   │   └── layout.tsx
│   │   ├── profile-setup/
│   │   │   └── page.tsx                      ← GET /profile-setup
│   │   └── api/
│   │       ├── clarify/
│   │       │   └── route.ts                  ← POST /api/clarify
│   │       ├── breakdown/
│   │       │   └── route.ts                  ← POST /api/breakdown
│   │       ├── profile/
│   │       │   └── route.ts                  ← GET, POST /api/profile
│   │       └── tasks/
│   │           ├── route.ts                  ← GET, DELETE /api/tasks
│   │           └── [taskId]/
│   │               ├── route.ts              ← DELETE /api/tasks/:taskId
│   │               └── steps/
│   │                   └── [stepId]/
│   │                       └── route.ts      ← PATCH /api/tasks/:taskId/steps/:stepId
│   ├── components/
│   │   ├── app/
│   │   │   ├── AppShell.tsx
│   │   │   ├── AppNavbar.tsx
│   │   │   ├── TaskInput.tsx
│   │   │   ├── ClarificationChat.tsx
│   │   │   └── TaskList.tsx
│   │   └── ui/                               ← Shadcn/ui components
│   ├── lib/
│   │   ├── prisma.ts
│   │   └── supabase/
│   │       ├── client.ts
│   │       ├── server.ts
│   │       └── middleware.ts
│   ├── middleware.ts                          ← Auth guard (Supabase session refresh)
│   └── types/
│       └── index.ts
├── prisma/
│   └── schema.prisma
├── ROUTES.md                                 ← This file
├── README.md
└── explainer_fluye.md
```
