# FLUYE - AI-Powered ADHD Task Translator
## Production SaaS Proposal - 48 Hour Hackathon

---

## 🎯 OBJECTIVE

Build a production-ready SaaS that solves ADHD task paralysis through conversational AI that understands user context. Unlike generic todo apps, Fluye asks clarifying questions before breaking down vague tasks into concrete, contextually-relevant steps.

**Why This Matters (Shadow Platform Vision):**
This is the first piece of Shadow Platform - technology that helps people live consciously. Better organization → reduced cognitive load → more energy for authentic living and growth.

**Hackathon Constraints:**
- 48 hours to ship
- Must be production-ready (database, auth, deployment)
- Judges evaluate: working core feature + professional UI + real SaaS architecture
- Bonus points: payment integration, security considerations

---

## 🏗️ 1. ARCHITECTURE DESIGN

**Pattern:** Context-Aware Conversational Task Decomposition

This architecture combines:
- **User context storage** (profile, work, projects)
- **Conversational AI clarification** (asks questions before breaking down tasks)
- **Persistent state management** (tasks survive across sessions)
- **Idempotent operations** (never duplicate data)

### System Diagram
```
┌────────────────────────────────────────────────────────────┐
│                  FRONTEND (Next.js 14)                      │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐   ┌──────────────┐  │
│  │   Landing    │───▶│  Auth Flow   │──▶│  Profile     │  │
│  │   Page       │    │  (Supabase)  │   │  Setup       │  │
│  └──────────────┘    └──────────────┘   └──────┬───────┘  │
│                                                  │          │
│                                         ┌────────▼───────┐ │
│                                         │   Main App     │ │
│                                         │  - Task Input  │ │
│                                         │  - AI Chat     │ │
│                                         │  - Task List   │ │
│                                         └────────┬───────┘ │
└──────────────────────────────────────────────────┼─────────┘
                                                   │
                    ┌──────────────────────────────▼──────────┐
                    │      NEXT.JS API ROUTES                 │
                    │                                          │
                    │  /api/auth/*                            │
                    │  - Supabase Auth integration            │
                    │  - Session management                   │
                    │                                          │
                    │  /api/profile                           │
                    │  - CRUD for user profiles               │
                    │                                          │
                    │  /api/clarify                           │
                    │  - Takes vague task                     │
                    │  - Returns 2-3 clarifying questions     │
                    │                                          │
                    │  /api/breakdown                         │
                    │  - Takes task + answers + user context  │
                    │  - Returns structured concrete steps    │
                    │                                          │
                    │  /api/tasks                             │
                    │  - CRUD for tasks/steps                 │
                    │  - Completion tracking                  │
                    │                                          │
                    │  /api/stripe (optional)                 │
                    │  - Webhook handler                      │
                    │  - Subscription status                  │
                    └────────┬──────────┬──────────────────────┘
                             │          │
                ┌────────────▼──────┐   │
                │  Anthropic API    │   │
                │  (Claude Sonnet)  │   │
                │                   │   │
                │  - Clarification  │   │
                │  - Task breakdown │   │
                │  - Context-aware  │   │
                └───────────────────┘   │
                                        │
                            ┌───────────▼──────────────┐
                            │   DATABASE (Supabase)     │
                            │   PostgreSQL + Prisma     │
                            │                           │
                            │  - Users (Supabase Auth)  │
                            │  - UserProfiles           │
                            │  - Tasks                  │
                            │  - TaskSteps              │
                            │  - Subscriptions (if paid)│
                            └───────────────────────────┘
```

### Tech Stack

**Frontend:** 
- Next.js 14 (App Router) - Server components + client components
- TypeScript - Type safety throughout
- Tailwind CSS - Utility-first styling
- Shadcn/ui - Production-ready components

**Backend:**
- Next.js API Routes - Serverless functions
- Prisma ORM - Type-safe database queries
- Supabase PostgreSQL - Managed database + auth

**AI:**
- Anthropic API (Claude Sonnet 4.5) - Conversational task breakdown
- *(Check if your Claude subscription includes API access)*
- *(Alternative: Gemini API if you have access)*

**Authentication:**
- Supabase Auth - OAuth providers (Google, GitHub)
- Persistent sessions - Cookie-based, no repeated logins

**Payments (Optional - Bonus Points):**
- Stripe - Subscription management
- Free tier: 10 tasks/day
- Paid tier: Unlimited

**Deployment:**
- Vercel - Next.js optimized hosting
- Environment variables for all secrets

---

## ✨ 2. FEATURE DESIGN

### Core Features to Build:

#### **1. Authentication & Onboarding Flow**

**Landing Page:** You can find our landing page here /home/bambi/WorkspaceTxp/WorkspaceConnect/learning-track/adal-vibecoding-bootcamp/fluye/fluye-landing-page
- Hero: "Kill the Paralysis. Slice the Task."
- Value prop: "Your ADHD doesn't need another planner. It needs a translator."
- CTA: "Start for Free" → Auth flow

**Supabase Auth Integration:**
- OAuth providers: Google (minimum), GitHub (if time)
- On successful auth → redirect to profile setup (first time) or app (returning)
- Persistent session (30-day cookie)
- Logout functionality

**Profile Setup (First-Time Users):**
```
┌─────────────────────────────────────────┐
│  Tell me a bit about yourself           │
│  (This helps me understand your tasks)  │
│                                         │
│  Name: [Daniel]                         │
│                                         │
│  Role/Work:                             │
│  ┌─────────────────────────────────┐   │
│  │ Data Engineer at Techspert      │   │
│  │ Working with AWS, Python, SQL   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Current Projects (optional):           │
│  ┌─────────────────────────────────┐   │
│  │ Expert sourcing analytics app   │   │
│  │ Medallion architecture setup    │   │
│  └─────────────────────────────────┘   │
│                                         │
│            [Continue →]                 │
└─────────────────────────────────────────┘
```

Stored in database. Used by AI for context.

#### **2. Main Application - Conversational Task Breakdown**

**Step 1: Task Input**
```
┌─────────────────────────────────────────┐
│  What do you need to do today?          │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Fix segments dataset            │   │
│  │ Create PoP for business metrics │   │
│  │ Start Iceberg table             │   │
│  │                                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Tip: Be vague if you want - I'll ask  │
│  questions to help clarify.             │
│                                         │
│          [Get Clarity →]                │
└─────────────────────────────────────────┘
```

**Step 2: AI Clarification**
```
┌─────────────────────────────────────────┐
│  💬 I need a bit more context:          │
│                                         │
│  1. For "Fix segments dataset" - what   │
│     specific issue are you fixing?      │
│     (data quality, performance, etc.)   │
│                                         │
│     [Text input]                        │
│                                         │
│  2. What's the main goal of the PoP?    │
│     (stakeholder report, analysis?)     │
│                                         │
│     [Text input]                        │
│                                         │
│  3. Is the Iceberg table for a new      │
│     feature or replacing existing?      │
│                                         │
│     [Text input]                        │
│                                         │
│     [Skip] [Break It Down →]            │
└─────────────────────────────────────────┘
```

AI generates 2-3 clarifying questions max. User can skip if they want generic breakdown.

**Step 3: AI Processing**
```
┌─────────────────────────────────────────┐
│  ⏳ Analyzing your tasks...              │
│                                         │
│  Using your profile + answers to create │
│  concrete, achievable steps...          │
└─────────────────────────────────────────┘
```

Backend:
1. Loads user profile from database
2. Combines: vague task + clarifying answers + user context
3. Calls Anthropic API with full context
4. Returns 3-5 concrete steps per task

**Step 4: Task Display**
```
┌──────────────────────────────────────────────┐
│  Your Tasks (Concrete & Achievable)          │
│                                              │
│  Fix segments dataset                        │
│  Context: Duplicate aggregations issue       │
│  ☐ Review main_experts table for duplicates │
│  ☐ Create unique constraint on expert_id    │
│  ☐ Add deduplication logic to ETL pipeline  │
│                                              │
│  Create PoP for business metrics             │
│  Context: Stakeholder quarterly report       │
│  ☐ Draft 3-section outline (intro/data/rec) │
│  ☑ List KPIs per section                    │ ← Done
│  ☐ Map each KPI to data source              │
│                                              │
│  [+ Add More Tasks]    [Clear All]           │
└──────────────────────────────────────────────┘
```

Notice: AI used context (user is data engineer, knows what ETL pipeline means, references specific tables from their work).

#### **3. Task Management Features**

**Completion Tracking:**
- Click checkbox → instant save to database
- Visual feedback: checkmark animation, strikethrough
- Timestamp stored: completedAt (for future "completed 2 hours ago" feature)

**Persistence:**
- All tasks stored in PostgreSQL
- Returning tomorrow → sees yesterday's incomplete tasks
- Option to archive completed tasks

**Add More Tasks:**
- Collapses current list
- Shows input again
- Goes through same clarification flow

**Clear All:**
- Confirmation modal: "Are you sure? This will delete all your current tasks."
- On confirm: soft delete (mark as archived, don't hard delete)

#### **4. Security Features (Production Requirements)**

**Environment Variables:**
```env
# Never exposed on frontend
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=... (public, safe)
SUPABASE_SERVICE_ROLE_KEY=... (secret)
STRIPE_SECRET_KEY=sk_live_... (if payments)
STRIPE_WEBHOOK_SECRET=whsec_... (if payments)
```

**Rate Limiting:**
- `/api/clarify`: 20 requests/hour per user
- `/api/breakdown`: 50 requests/day per user (prevents abuse)
- Implement using Vercel Edge Config or simple Redis

**Input Validation:**
- Max task input length: 2000 characters
- Sanitize all user inputs (prevent XSS)
- Validate task breakdown responses from AI

**Data Protection:**
- User can only access their own tasks (enforce userId in queries)
- No public endpoints that expose user data
- Prisma Row Level Security (RLS) via Supabase

**Idempotency:**
- Task creation checks: don't create duplicate tasks for same input
- Use unique constraints in database
- Breakdown API: cache results for identical inputs (5min TTL)

#### **5. Payment Integration (Optional - Bonus Points)**

**Tiers:**
- **Free**: 10 task breakdowns/day
- **Pro ($5/month)**: Unlimited breakdowns + priority support

**Stripe Integration:**
- Checkout session on "Upgrade to Pro" button
- Webhook `/api/stripe/webhook` handles:
  - `checkout.session.completed` → activate subscription
  - `customer.subscription.deleted` → downgrade to free
- Store subscription status in `UserProfile.subscriptionStatus`

**Usage Tracking:**
- Increment `UserProfile.taskBreakdownsToday` on each breakdown
- Reset counter daily (cron job or on-demand check)
- If free tier hits limit → show upgrade modal

---

## 🗄️ 3. DATABASE DESIGN
```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Supabase Auth handles User table
// We extend with UserProfile

model UserProfile {
  id        String   @id @default(uuid())
  userId    String   @unique // Supabase auth user ID
  email     String   @unique
  name      String
  
  // Context for AI
  roleWork  String?  // "Data Engineer at Techspert..."
  projects  String?  // "Expert sourcing app, Medallion architecture..."
  
  // Subscription tracking
  subscriptionStatus String   @default("free") // "free" | "pro"
  stripeCustomerId   String?
  
  // Usage tracking (for rate limiting)
  taskBreakdownsToday Int     @default(0)
  lastBreakdownReset  DateTime @default(now())
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  tasks     Task[]
}

model Task {
  id               String      @id @default(uuid())
  userId           String
  user             UserProfile @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  originalText     String      // "Fix segments dataset"
  clarification    String?     // JSON: { "issue": "duplicate aggregations", ... }
  
  status           String      @default("active") // "active" | "completed" | "archived"
  
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
  completedAt      DateTime?
  
  steps            TaskStep[]
  
  @@index([userId, status]) // Query optimization
}

model TaskStep {
  id          String    @id @default(uuid())
  taskId      String
  task        Task      @relation(fields: [taskId], references: [id], onDelete: Cascade)
  
  text        String    // "Review main_experts table for duplicates"
  order       Int       // 0, 1, 2... (maintains AI's logical ordering)
  
  completed   Boolean   @default(false)
  completedAt DateTime?
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([taskId, order]) // Efficient ordering queries
}

// Optional: If implementing Stripe
model Subscription {
  id                 String      @id @default(uuid())
  userId             String
  user               UserProfile @relation(fields: [userId], references: [id])
  
  stripeSubscriptionId String    @unique
  status             String      // "active" | "canceled" | "past_due"
  currentPeriodEnd   DateTime
  
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt
}
```

**Key Design Decisions:**

1. **UserProfile** extends Supabase Auth
   - Stores AI context (role, projects)
   - Tracks subscription & usage

2. **Task.clarification** as JSON
   - Stores Q&A from clarification step
   - Can be displayed later ("Why I broke it down this way")

3. **Cascade deletes**
   - Delete user → deletes all tasks → deletes all steps
   - Maintains data integrity

4. **Indexes for performance**
   - userId + status: fast "show me active tasks"
   - taskId + order: fast step ordering

5. **Idempotency consideration**
   - Could add `Task.inputHash` (hash of originalText + clarification)
   - Check before creating: "Did we already break this down?"

---

## 🔧 4. API IMPLEMENTATION DETAILS

### `/api/clarify` (POST)

**Input:**
```typescript
{
  taskInput: string  // Raw brain dump
}
```

**Process:**
1. Load user profile from database (get context)
2. Call Anthropic API:
```
   System: You help people with ADHD break down vague tasks.
   Context: User is ${profile.roleWork}. Working on: ${profile.projects}.
   
   User just wrote: "${taskInput}"
   
   Generate 2-3 short, specific clarifying questions to help break this down better.
   Questions should be about: specific problems, goals, or constraints.
   
   Return JSON: { questions: string[] }
```
3. Parse response

**Output:**
```typescript
{
  questions: [
    "For 'Fix segments dataset' - what specific issue are you fixing?",
    "What's the main goal of the PoP?",
    "Is the Iceberg table replacing something existing?"
  ]
}
```

**Error Handling:**
- API failure → return generic questions
- Rate limit hit → return error with upgrade CTA (if free tier)

---

### `/api/breakdown` (POST)

**Input:**
```typescript
{
  taskInput: string,
  answers: string[],  // User's answers to clarification questions
  skipClarification?: boolean  // If user clicked "Skip"
}
```

**Process:**
1. Load user profile
2. Check rate limit (free tier: 10/day)
3. Call Anthropic API with full context:
```
   System: You are a task breakdown assistant for people with ADHD.
   
   User context:
   - Role: ${profile.roleWork}
   - Projects: ${profile.projects}
   
   Original tasks: "${taskInput}"
   
   Clarifications:
   ${answers.map((a, i) => `Q${i+1}: ${questions[i]}\nA: ${a}`).join('\n')}
   
   Break each task into 3-5 concrete steps.
   Rules:
   - Each step: actionable verb + specific detail
   - Each step: completable in 5-30 minutes
   - Use user's technical context (they know AWS, Python, SQL, data engineering)
   - Order steps logically
   
   Return JSON:
   {
     tasks: [
       {
         original: string,
         context: string, // What you understood from clarification
         steps: string[]
       }
     ]
   }
```
4. Parse AI response
5. Store in database:
   - Create Task records
   - Create TaskStep records (with order preserved)
6. Increment user's daily breakdown counter

**Output:**
```typescript
{
  tasks: [
    {
      id: "uuid",
      original: "Fix segments dataset",
      context: "Duplicate aggregations issue",
      steps: [
        { id: "uuid", text: "Review main_experts table...", order: 0 },
        { id: "uuid", text: "Create unique constraint...", order: 1 },
        { id: "uuid", text: "Add deduplication logic...", order: 2 }
      ]
    }
  ]
}
```

**Error Handling:**
- AI returns malformed JSON → retry once with stricter prompt
- Still fails → use fallback: generic breakdown without context
- Rate limit → return 429 with clear message

**Idempotency:**
- Hash `taskInput + answers`
- Check database: did we already process this exact input?
- If yes (within last 24h): return cached breakdown
- If no: proceed with AI call

---

### `/api/tasks` (GET, PATCH, DELETE)

**GET `/api/tasks`**
- Returns all active tasks for authenticated user
- Includes nested steps (ordered)
- Filter by status if needed

**PATCH `/api/tasks/:taskId/steps/:stepId`**
```typescript
{
  completed: boolean
}
```
- Toggle step completion
- Set `completedAt` timestamp
- Return updated task

**DELETE `/api/tasks`**
- Soft delete: mark all user's tasks as "archived"
- Don't hard delete (user might want to restore)

---

## 🎨 5. UI/UX SPECIFICATIONS

**Design System (Match Landing Page):**

**Colors:**
```css
--bg-primary: #0F172A;      /* Dark navy */
--bg-secondary: #1E293B;    /* Lighter navy */
--accent: #A8E6CF;          /* Mint green */
--text-primary: #F8FAFC;    /* Off-white */
--text-secondary: #94A3B8;  /* Gray */
--border: #334155;          /* Subtle */
```

**Typography:**
- Headings: Inter/SF Pro, Bold, 32-48px
- Body: Inter/SF Pro, Regular, 16px
- Monospace (for tasks): JetBrains Mono, 14px

**Component Library (Shadcn/ui):**
- Button (primary: mint green, secondary: outline)
- Input / Textarea (dark theme)
- Checkbox (custom mint green check)
- Modal / Dialog
- Loading Spinner

**Animations:**
- Checkbox check: 200ms ease-out
- Task completion: fade + strikethrough
- Loading states: pulse

**Responsive:**
- Mobile-first design
- Breakpoints: sm (640px), md (768px), lg (1024px)

---

## ⏱️ 6. IMPLEMENTATION TIMELINE

### **SATURDAY (8 hours remaining)**

**Hour 1: Setup**
```bash
npx create-next-app@latest fluye --typescript --tailwind --app
npm install @anthropic-ai/sdk @prisma/client @supabase/supabase-js stripe
npm install -D prisma
npx shadcn-ui@latest init
npx prisma init
```

**Hour 2-3: Database & Auth**
- Write complete Prisma schema
- Set up Supabase project
- Configure auth providers
- `npx prisma db push`
- Test auth flow

**Hour 4-5: Core API Routes**
- `/api/auth/*` (Supabase integration)
- `/api/clarify` (with Anthropic)
- `/api/breakdown` (with Anthropic + DB writes)
- Test with Postman

**Hour 6-7: Frontend - Auth & Profile**
- Login page
- Profile setup form
- Protected route middleware

**Hour 8: Frontend - Task Input**
- Task input component
- Connect to `/api/clarify`
- Clarification Q&A UI

---

### **SUNDAY (12 hours)**

**Morning (4h):**
- Task breakdown display
- Checkbox functionality
- Connect to `/api/breakdown` and `/api/tasks`
- Loading/error states

**Afternoon (4h):**
- Styling (match landing page)
- Mobile responsive
- Micro-interactions
- Landing page → app connection

**Evening (4h):**
- Stripe integration (if time)
- Security audit (env vars, rate limits, validation)
- Deploy to Vercel
- End-to-end testing
- Bug fixes

---

### **MONDAY (Buffer)**

- Final polish
- Screenshot
- Explainer doc
- Submit

---

## 📋 7. SUBMISSION CHECKLIST

**Required Deliverables:**

✅ **Landing page screenshot** (1280px+ width)
- Shows hero, value prop, CTA
- File: `landing_page_fluye.png`

✅ **All Next.js routes exported**
- Zip entire project folder
- Include `.env.example` (no secrets)

✅ **explainer_fluye.md:**
```markdown
# Fluye - AI-Powered ADHD Task Translator

**Problem:** People with ADHD write vague tasks like "Fix the dataset" and then freeze because they don't know where to start.

**Solution:** Fluye asks clarifying questions, uses your work context, and breaks vague tasks into concrete 5-minute steps you can actually tick off.

**Tech:** Next.js 14, Anthropic API, Supabase, Prisma, Stripe

**Live:** https://fluye.vercel.app
**GitHub:** https://github.com/yourusername/fluye

**Team:** Daniel (solo)
```

✅ **GitHub repo** (public)

✅ **Live deployment** (Vercel)

---

## 🎯 8. SUCCESS CRITERIA

**Hackathon Judging (What They're Looking For):**
1. ✅ Clear value proposition
2. ✅ Working end-to-end (auth → input → AI → breakdown → persist)
3. ✅ Production architecture (database, not localStorage)
4. ✅ Professional UI
5. ✅ Security considerations
6. ✅ Bonus: Payment integration

**Internal (Can Daniel Actually Use This?):**
- Monday morning: can he use it for real work tasks?
- Does the AI breakdown actually help or is it generic garbage?
- Would someone pay $5/month for this?

---

## 🚀 9. ADAL USAGE GUIDE

**When to use ADAL:**
- Generate complete components (TaskInput, TaskList, etc.)
- API route implementations
- Prisma schema generation
- Supabase auth setup

**When to use Claude (architecture decisions):**
- "How should I structure the clarification flow?"
- "Is this Prisma schema optimal?"
- "Should I cache AI responses?"

**When to use Gemini (creative):**
- Clarifying question generation
- Error messages
- Empty state copy

---

**Ready to build. Let's ship this thing. 🚀**