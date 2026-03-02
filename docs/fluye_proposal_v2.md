# FLUYE V2 - Production-Ready Iteration
## 4-Week Development Plan - March 3-30, 2026

---

## 🎯 V2 OBJECTIVE

**Building on V1 Success (92/100):**
We shipped a working product in 48 hours and received detailed judge feedback. V1 proved we can ship. V2 proves we can build something people actually want to use.

**V2 Goals:**
1. ✅ Fix all security vulnerabilities (ownership checks, rate limiting, validation)
2. ✅ Add usability features that improve daily use (multi-language, step refresh, progress tracking)
3. ✅ Get 10 real users testing the product
4. ✅ Validate product-market fit before considering monetization

**Judge Feedback Summary:**
- Score: 92/100
- Strengths: Clear narrative, solid architecture, thoughtful features
- Critical Issues: Security vulnerabilities, rate limiting durability, validation gaps
- Suggestions: Step refresh, "why these steps" explainer, multi-language support

**Timeline:** 4 weeks (March 3-30, 2026)

---

## 🚨 WEEK 1: CRITICAL SECURITY FIXES (March 3-9)

These are non-negotiable vulnerabilities that must be fixed before any new features.

### **1. Step Ownership Check (CRITICAL - Security Vulnerability)**

**Problem:** Users can modify other people's steps by guessing step IDs.

**Current Code (UNSAFE):**
```typescript
// /app/api/tasks/[taskId]/steps/[stepId]/route.ts
export async function PATCH(
  request: Request,
  { params }: { params: { taskId: string; stepId: string } }
) {
  const { completed } = await request.json()
  
  // ❌ VULNERABILITY: No ownership verification
  const step = await prisma.taskStep.update({
    where: { id: params.stepId },
    data: { 
      completed,
      completedAt: completed ? new Date() : null 
    }
  })
  
  return Response.json(step)
}
```

**Fixed Code (SAFE):**
```typescript
// /app/api/tasks/[taskId]/steps/[stepId]/route.ts
export async function PATCH(
  request: Request,
  { params }: { params: { taskId: string; stepId: string } }
) {
  const { user } = await getUser(request)
  const { completed } = await request.json()
  
  // ✅ SECURE: Verify step belongs to user's task
  const result = await prisma.taskStep.updateMany({
    where: { 
      id: params.stepId,
      taskId: params.taskId,
      task: {
        profileId: user.profile.id  // Ensure task belongs to user
      }
    },
    data: { 
      completed,
      completedAt: completed ? new Date() : null 
    }
  })
  
  if (result.count === 0) {
    return new Response("Unauthorized or not found", { status: 403 })
  }
  
  // Fetch updated step to return
  const step = await prisma.taskStep.findUnique({
    where: { id: params.stepId }
  })
  
  return Response.json(step)
}
```

**Testing:**
```typescript
// Test unauthorized access
const response = await fetch('/api/tasks/valid-task-id/steps/someone-elses-step-id', {
  method: 'PATCH',
  body: JSON.stringify({ completed: true })
})
// Should return 403
```

**Time: 2 hours**

---

### **2. Rate Limiting to Database (Durability Fix)**

**Problem:** In-memory Map doesn't persist across serverless invocations. Rate limiting fails in production.

**Current Code (BROKEN):**
```typescript
// /app/api/clarify/route.ts
const rateLimitMap = new Map<string, number[]>()  // ❌ Lost on each cold start

export async function POST(request: Request) {
  const { user } = await getUser(request)
  
  // This doesn't work in serverless
  const requests = rateLimitMap.get(user.id) || []
  // ...
}
```

**Fixed Implementation:**

**Step 1: Update Prisma Schema**
```prisma
// prisma/schema.prisma
model UserProfile {
  id        String   @id @default(uuid())
  userId    String   @unique
  email     String   @unique
  name      String
  
  // Context for AI
  roleWork  String?
  projects  String?
  preferredLanguage String @default("en") // NEW: "en" | "es"
  
  // Subscription tracking
  subscriptionStatus String   @default("free")
  stripeCustomerId   String?
  
  // Usage tracking (for rate limiting)
  taskBreakdownsToday Int      @default(0)
  lastBreakdownReset  DateTime @default(now())
  clarifyRequestsToday Int     @default(0)  // NEW
  lastClarifyReset    DateTime @default(now())  // NEW
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  tasks     Task[]
}
```

**Step 2: Migration**
```bash
npx prisma migrate dev --name add-clarify-rate-limit
npx prisma generate
```

**Step 3: Update API Route**
```typescript
// /app/api/clarify/route.ts
import { isNewDay } from '@/lib/utils'

export async function POST(request: Request) {
  const { user } = await getUser(request)
  
  // Fetch profile
  let profile = await prisma.userProfile.findUnique({
    where: { userId: user.id }
  })
  
  if (!profile) {
    return new Response("Profile not found", { status: 404 })
  }
  
  // Reset counter if new day
  if (isNewDay(profile.lastClarifyReset)) {
    profile = await prisma.userProfile.update({
      where: { id: profile.id },
      data: { 
        clarifyRequestsToday: 0,
        lastClarifyReset: new Date()
      }
    })
  }
  
  // Check limit (20/day for free tier)
  const limit = profile.subscriptionStatus === 'pro' ? 1000 : 20
  if (profile.clarifyRequestsToday >= limit) {
    return new Response(
      JSON.stringify({ 
        error: "Rate limit exceeded",
        message: profile.subscriptionStatus === 'free' 
          ? "Upgrade to Pro for unlimited requests"
          : "Daily limit reached"
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  }
  
  // Process request...
  const { taskInput } = await request.json()
  const questions = await generateClarifyingQuestions(taskInput, profile)
  
  // Increment counter
  await prisma.userProfile.update({
    where: { id: profile.id },
    data: { clarifyRequestsToday: { increment: 1 } }
  })
  
  return Response.json({ questions })
}
```

**Step 4: Utility Function**
```typescript
// /lib/utils.ts
export function isNewDay(lastReset: Date): boolean {
  const now = new Date()
  const reset = new Date(lastReset)
  
  return (
    now.getFullYear() !== reset.getFullYear() ||
    now.getMonth() !== reset.getMonth() ||
    now.getDate() !== reset.getDate()
  )
}
```

**Testing:**
```typescript
// Test rate limiting
for (let i = 0; i < 21; i++) {
  const response = await fetch('/api/clarify', {
    method: 'POST',
    body: JSON.stringify({ taskInput: "test" })
  })
  
  if (i < 20) {
    expect(response.status).toBe(200)
  } else {
    expect(response.status).toBe(429)
  }
}
```

**Time: 4 hours**

---

### **3. AI Response Validation with Zod**

**Problem:** AI can return malformed JSON. No validation before parsing.

**Install Zod:**
```bash
npm install zod
```

**Define Schemas:**
```typescript
// /lib/schemas.ts
import { z } from 'zod'

export const ClarifyResponseSchema = z.object({
  questions: z.array(z.string().min(10).max(200)).min(1).max(3)
})

export const BreakdownResponseSchema = z.object({
  tasks: z.array(
    z.object({
      original: z.string(),
      context: z.string(),
      steps: z.array(z.string().min(10).max(300)).min(3).max(5)
    })
  ).min(1)
})

export type ClarifyResponse = z.infer<typeof ClarifyResponseSchema>
export type BreakdownResponse = z.infer<typeof BreakdownResponseSchema>
```

**Update Clarify API:**
```typescript
// /app/api/clarify/route.ts
import { ClarifyResponseSchema } from '@/lib/schemas'

export async function POST(request: Request) {
  // ... rate limiting code ...
  
  const { taskInput } = await request.json()
  
  // Call AI (with retry logic)
  let aiResponse: string
  let attempt = 0
  const maxAttempts = 2
  
  while (attempt < maxAttempts) {
    try {
      aiResponse = await callGeminiAPI(taskInput, profile, attempt > 0)
      
      // Extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No JSON found in response")
      }
      
      const parsed = JSON.parse(jsonMatch[0])
      
      // Validate with Zod
      const validated = ClarifyResponseSchema.parse(parsed)
      
      // Success!
      await incrementClarifyCounter(profile.id)
      return Response.json(validated)
      
    } catch (error) {
      attempt++
      
      if (attempt >= maxAttempts) {
        // Fallback: return generic questions
        console.error("AI validation failed after retries:", error)
        
        const fallback = {
          questions: [
            "What specific problem are you trying to solve?",
            "What's the desired outcome or goal?",
            "Are there any constraints or requirements I should know about?"
          ]
        }
        
        await incrementClarifyCounter(profile.id)
        return Response.json(fallback)
      }
      
      // Retry with stricter prompt
      continue
    }
  }
}

async function callGeminiAPI(
  taskInput: string, 
  profile: UserProfile,
  strictMode: boolean = false
): Promise<string> {
  const systemPrompt = strictMode
    ? "You MUST respond with ONLY valid JSON. No markdown, no code blocks, no explanations. Just: {\"questions\": [\"...\", \"...\", \"...\"]}"
    : "Generate 2-3 clarifying questions. Return JSON: {\"questions\": [...]}"
  
  // ... Gemini API call ...
}
```

**Update Breakdown API:**
```typescript
// /app/api/breakdown/route.ts
import { BreakdownResponseSchema } from '@/lib/schemas'

export async function POST(request: Request) {
  // Similar validation pattern
  try {
    const aiResponse = await callGeminiForBreakdown(...)
    const validated = BreakdownResponseSchema.parse(JSON.parse(aiResponse))
    
    // Store in database...
    return Response.json(validated)
    
  } catch (error) {
    // Retry once with stricter prompt, then fallback
  }
}
```

**Time: 4 hours**

---

### **4. Rename userId → profileId (Code Clarity)**

**Problem:** `Task.userId` references `UserProfile.id` (not Supabase auth user ID). Confusing naming invites bugs.

**Update Prisma Schema:**
```prisma
// prisma/schema.prisma
model Task {
  id               String      @id @default(uuid())
  profileId        String      // ✅ Renamed from userId
  profile          UserProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  
  originalText     String
  clarification    String?
  
  status           String      @default("active")
  
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
  completedAt      DateTime?
  
  steps            TaskStep[]
  
  @@index([profileId, status])  // ✅ Updated index
}
```

**Migration:**
```bash
npx prisma migrate dev --name rename-userid-to-profileid
```

**Update All Queries:**
```typescript
// Find all instances of:
// - Task.userId → Task.profileId
// - task.userId → task.profileId  
// - { userId: ... } → { profileId: ... }

// Example:
const tasks = await prisma.task.findMany({
  where: { 
    profileId: user.profile.id,  // ✅ Clear: this is UserProfile.id
    status: 'active' 
  }
})
```

**Time: 2 hours**

---

### **5. Documentation & Limits Alignment**

**Problem:** README says 50/day, code enforces 10/day. Inconsistent.

**Decision:** Keep 10/day (more conservative for free tier).

**Update All Documentation:**
```markdown
// README.md
## Free Tier Limits
- 10 task breakdowns per day
- 20 clarification requests per day

## Pro Tier ($5/month)
- Unlimited task breakdowns
- Unlimited clarification requests
- Priority support
```
```markdown
// PROPOSAL.md
**Free tier:** 10 task breakdowns/day, 20 clarifications/day
**Pro tier:** Unlimited
```
```typescript
// Code already correct at 10/day
const limit = profile.subscriptionStatus === 'pro' ? 999999 : 10
```

**Time: 1 hour**

---

**WEEK 1 TOTAL: 13 hours**

**Deliverable:** Secure, production-ready backend with all critical vulnerabilities fixed.

---

## ✨ WEEK 2: USABILITY FEATURES (March 10-16)

Now that it's secure, make it useful for real people.

### **1. Multi-Language Support (Spanish + English)**

**Why:** Your users speak Spanish. Chilean market is Spanish. This differentiates you globally.

**Implementation:**

**Step 1: Update Profile Schema (already done in Week 1)**
```prisma
model UserProfile {
  // ...
  preferredLanguage String @default("en") // "en" | "es"
}
```

**Step 2: Profile Setup UI**
```typescript
// /app/profile-setup/page.tsx
export default function ProfileSetup() {
  const [language, setLanguage] = useState('en')
  
  return (
    <form>
      {/* ... name, roleWork, projects ... */}
      
      <div>
        <label>Preferred Language</label>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </div>
      
      <button type="submit">Continue →</button>
    </form>
  )
}
```

**Step 3: Translation Dictionary**
```typescript
// /lib/i18n.ts
export const translations = {
  en: {
    taskInput: {
      title: "What do you need to do today?",
      placeholder: "Fix segments dataset\nCreate PoP for business metrics\nStart Iceberg table",
      tip: "Be vague if you want - I'll ask questions to help clarify.",
      button: "Get Clarity"
    },
    clarification: {
      title: "I need a bit more context:",
      skip: "Skip",
      button: "Break It Down"
    },
    taskList: {
      title: "Your Tasks (Concrete & Achievable)",
      addMore: "Add More Tasks",
      clearAll: "Clear All",
      progressLabel: "done"
    },
    empty: {
      title: "Ready to kill the paralysis?",
      subtitle: "Paste your vague to-do here. I'll ask a few questions, then break it into concrete steps.",
      exampleButton: "Try an example"
    }
  },
  es: {
    taskInput: {
      title: "¿Qué necesitas hacer hoy?",
      placeholder: "Arreglar dataset de segmentos\nCrear PoP para métricas de negocio\nIniciar tabla Iceberg",
      tip: "Sé vago si quieres - te haré preguntas para aclarar.",
      button: "Dame Claridad"
    },
    clarification: {
      title: "Necesito un poco más de contexto:",
      skip: "Omitir",
      button: "Descomponer"
    },
    taskList: {
      title: "Tus Tareas (Concretas y Alcanzables)",
      addMore: "Agregar Más Tareas",
      clearAll: "Limpiar Todo",
      progressLabel: "completado"
    },
    empty: {
      title: "¿Listo para matar la parálisis?",
      subtitle: "Pega tu tarea vaga aquí. Te haré algunas preguntas, luego la descompondré en pasos concretos.",
      exampleButton: "Probar un ejemplo"
    }
  }
}

export function useTranslation(language: 'en' | 'es') {
  return translations[language]
}
```

**Step 4: Update AI Prompts**
```typescript
// /lib/ai.ts
export async function generateClarifyingQuestions(
  taskInput: string,
  profile: UserProfile
): Promise<string[]> {
  const lang = profile.preferredLanguage as 'en' | 'es'
  
  const systemPrompts = {
    en: `You help people with ADHD break down vague tasks.
Context: User is ${profile.roleWork}. Working on: ${profile.projects}.

User just wrote: "${taskInput}"

Generate 2-3 short, specific clarifying questions to help break this down better.
Questions should be about: specific problems, goals, or constraints.

Return JSON: { "questions": ["...", "...", "..."] }`,
    
    es: `Ayudas a personas con TDAH a descomponer tareas vagas.
Contexto: El usuario es ${profile.roleWork}. Trabajando en: ${profile.projects}.

El usuario escribió: "${taskInput}"

Genera 2-3 preguntas cortas y específicas para ayudar a aclarar mejor.
Las preguntas deben ser sobre: problemas específicos, objetivos o restricciones.

Devuelve JSON: { "questions": ["...", "...", "..."] }`
  }
  
  const response = await callGeminiAPI(systemPrompts[lang])
  // ... validation ...
  
  return response.questions
}

export async function breakdownTasks(
  taskInput: string,
  answers: string[],
  profile: UserProfile
): Promise<BreakdownResponse> {
  const lang = profile.preferredLanguage as 'en' | 'es'
  
  const systemPrompts = {
    en: `You are a task breakdown assistant for people with ADHD.

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
- Use user's technical context
- Order steps logically

Return JSON: { "tasks": [{ "original": "...", "context": "...", "steps": ["...", "..."] }] }`,
    
    es: `Eres un asistente de descomposición de tareas para personas con TDAH.

Contexto del usuario:
- Rol: ${profile.roleWork}
- Proyectos: ${profile.projects}

Tareas originales: "${taskInput}"

Aclaraciones:
${answers.map((a, i) => `P${i+1}: ${questions[i]}\nR: ${a}`).join('\n')}

Descompone cada tarea en 3-5 pasos concretos.
Reglas:
- Cada paso: verbo de acción + detalle específico
- Cada paso: completable en 5-30 minutos
- Usa el contexto técnico del usuario
- Ordena los pasos lógicamente

Devuelve JSON: { "tasks": [{ "original": "...", "context": "...", "steps": ["...", "..."] }] }`
  }
  
  const response = await callGeminiAPI(systemPrompts[lang])
  // ... validation ...
  
  return response
}
```

**Step 5: Use in Components**
```typescript
// /app/app/page.tsx
'use client'

import { useTranslation } from '@/lib/i18n'
import { useProfile } from '@/hooks/useProfile'

export default function AppPage() {
  const { profile } = useProfile()
  const t = useTranslation(profile.preferredLanguage)
  
  return (
    <div>
      <h1>{t.taskInput.title}</h1>
      <textarea placeholder={t.taskInput.placeholder} />
      <p className="text-sm text-gray-400">{t.taskInput.tip}</p>
      <button>{t.taskInput.button}</button>
    </div>
  )
}
```

**Time: 8 hours**

---

### **2. Step Refresh/Regenerate**

**Why:** AI won't always nail it. Users need agency to fix bad suggestions.

**Implementation:**

**Step 1: New API Route**
```typescript
// /app/api/tasks/[taskId]/steps/[stepId]/regenerate/route.ts
import { BreakdownResponseSchema } from '@/lib/schemas'

export async function POST(
  request: Request,
  { params }: { params: { taskId: string; stepId: string } }
) {
  const { user } = await getUser(request)
  
  // Security: verify ownership
  const step = await prisma.taskStep.findFirst({
    where: { 
      id: params.stepId,
      task: {
        id: params.taskId,
        profileId: user.profile.id
      }
    },
    include: { 
      task: { 
        include: { profile: true } 
      } 
    }
  })
  
  if (!step) {
    return new Response("Not found", { status: 404 })
  }
  
  // Get all sibling steps for context
  const allSteps = await prisma.taskStep.findMany({
    where: { taskId: params.taskId },
    orderBy: { order: 'asc' }
  })
  
  // Call Gemini for new suggestion
  const lang = step.task.profile.preferredLanguage as 'en' | 'es'
  
  const prompts = {
    en: `User context: ${step.task.profile.roleWork}
Original task: ${step.task.originalText}
Current steps:
${allSteps.map(s => `- ${s.text}`).join('\n')}

The user wants a different suggestion for step: "${step.text}"

Suggest ONE alternative that is:
- More specific and actionable
- Takes 5-30 minutes
- Fits logically with the other steps

Return JSON: { "newStep": "..." }`,
    
    es: `Contexto del usuario: ${step.task.profile.roleWork}
Tarea original: ${step.task.originalText}
Pasos actuales:
${allSteps.map(s => `- ${s.text}`).join('\n')}

El usuario quiere una sugerencia diferente para el paso: "${step.text}"

Sugiere UNA alternativa que sea:
- Más específica y accionable
- Tome 5-30 minutos
- Encaje lógicamente con los otros pasos

Devuelve JSON: { "newStep": "..." }`
  }
  
  try {
    const response = await callGeminiAPI(prompts[lang])
    const parsed = JSON.parse(response)
    
    // Validate
    if (!parsed.newStep || typeof parsed.newStep !== 'string') {
      throw new Error("Invalid response")
    }
    
    // Update in database
    const updated = await prisma.taskStep.update({
      where: { id: step.id },
      data: { text: parsed.newStep }
    })
    
    return Response.json(updated)
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to regenerate step" }),
      { status: 500 }
    )
  }
}
```

**Step 2: Frontend Component**
```typescript
// /components/TaskStep.tsx
'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { RefreshCw, Loader2 } from 'lucide-react'

interface TaskStepProps {
  step: {
    id: string
    text: string
    completed: boolean
    order: number
  }
  taskId: string
  onUpdate: (step: any) => void
}

export function TaskStep({ step, taskId, onUpdate }: TaskStepProps) {
  const [isRegenerating, setIsRegenerating] = useState(false)
  
  const handleToggle = async () => {
    const response = await fetch(
      `/api/tasks/${taskId}/steps/${step.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ completed: !step.completed })
      }
    )
    
    const updated = await response.json()
    onUpdate(updated)
  }
  
  const handleRegenerate = async () => {
    setIsRegenerating(true)
    
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/steps/${step.id}/regenerate`,
        { method: 'POST' }
      )
      
      const updated = await response.json()
      onUpdate(updated)
    } finally {
      setIsRegenerating(false)
    }
  }
  
  return (
    <div className="group flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition">
      <Checkbox 
        checked={step.completed}
        onCheckedChange={handleToggle}
        disabled={isRegenerating}
      />
      
      <span className={cn(
        "flex-1 text-sm",
        step.completed && "line-through text-muted-foreground"
      )}>
        {step.text}
      </span>
      
      {!step.completed && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="opacity-0 group-hover:opacity-100 transition"
          title="Get a different suggestion"
        >
          {isRegenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  )
}
```

**Time: 5 hours**

---

### **3. Progress Bar for Tasks**

**Why:** Visual feedback = motivation. Shows you're making progress.

**Implementation:**
```typescript
// /components/TaskCard.tsx
'use client'

import { Progress } from '@/components/ui/progress'
import { Card } from '@/components/ui/card'

interface TaskCardProps {
  task: {
    id: string
    originalText: string
    clarification: string | null
    steps: Array<{
      id: string
      text: string
      completed: boolean
      order: number
    }>
  }
}

export function TaskCard({ task }: TaskCardProps) {
  const completedCount = task.steps.filter(s => s.completed).length
  const totalCount = task.steps.length
  const progress = (completedCount / totalCount) * 100
  
  return (
    <Card className="p-6 space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">{task.originalText}</h3>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{totalCount} done
          </span>
        </div>
        
        {/* Progress Bar */}
        <Progress value={progress} className="h-2" />
        
        {/* Context (if exists) */}
        {task.clarification && (
          <p className="text-sm text-muted-foreground">
            Context: {JSON.parse(task.clarification).context}
          </p>
        )}
      </div>
      
      {/* Steps */}
      <div className="space-y-2">
        {task.steps
          .sort((a, b) => a.order - b.order)
          .map(step => (
            <TaskStep 
              key={step.id} 
              step={step} 
              taskId={task.id}
              onUpdate={handleStepUpdate}
            />
          ))}
      </div>
    </Card>
  )
}
```

**Shadcn Progress Component:**
```bash
npx shadcn-ui@latest add progress
```

**Time: 2 hours**

---

### **4. "Why These Steps?" Explainer**

**Why:** Judge suggestion. Helps users understand AI reasoning.

**Implementation:**
```typescript
// /components/TaskCard.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'

export function TaskCard({ task }: TaskCardProps) {
  const [showContext, setShowContext] = useState(false)
  
  const clarification = task.clarification 
    ? JSON.parse(task.clarification) 
    : null
  
  return (
    <Card className="p-6 space-y-4">
      {/* Header & Progress ... */}
      
      {/* Context Explainer */}
      {clarification && (
        <div className="border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowContext(!showContext)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {showContext ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Hide reasoning
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Why these steps?
              </>
            )}
          </Button>
          
          {showContext && (
            <div className="mt-3 p-4 bg-secondary/30 rounded-lg space-y-2">
              <p className="text-sm font-medium">How I broke this down:</p>
              
              <div className="space-y-1 text-sm text-muted-foreground">
                <p><strong>Your role:</strong> {task.profile.roleWork}</p>
                <p><strong>Context from clarification:</strong> {clarification.context}</p>
                
                {clarification.answers && (
                  <div className="mt-2 space-y-1">
                    <p className="font-medium">Your answers:</p>
                    {clarification.answers.map((a: string, i: number) => (
                      <p key={i}>• {a}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Steps ... */}
    </Card>
  )
}
```

**Time: 3 hours**

---

### **5. Empty States & Onboarding**

**Why:** First-time users need guidance.

**Implementation:**
```typescript
// /components/EmptyState.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface EmptyStateProps {
  onExampleClick: () => void
  t: any // translations
}

export function EmptyState({ onExampleClick, t }: EmptyStateProps) {
  return (
    <Card className="p-12 text-center space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{t.empty.title}</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {t.empty.subtitle}
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button onClick={onExampleClick} variant="outline">
          {t.empty.exampleButton}
        </Button>
      </div>
      
      {/* Example tasks preview */}
      <div className="mt-8 space-y-2 text-left max-w-md mx-auto">
        <p className="text-sm font-medium text-muted-foreground">Example tasks:</p>
        <div className="space-y-1 text-sm bg-secondary/30 p-4 rounded-lg">
          <p>• Prepare Q1 presentation</p>
          <p>• Fix bug in checkout flow</p>
          <p>• Plan team offsite</p>
        </div>
      </div>
    </Card>
  )
}
```

**Main App Integration:**
```typescript
// /app/app/page.tsx
export default function AppPage() {
  const { tasks } = useTasks()
  const [taskInput, setTaskInput] = useState('')
  
  const handleExampleClick = () => {
    setTaskInput("Prepare Q1 presentation\nFix bug in checkout flow\nPlan team offsite")
  }
  
  return (
    <div>
      {tasks.length === 0 ? (
        <EmptyState onExampleClick={handleExampleClick} t={t} />
      ) : (
        <TaskList tasks={tasks} />
      )}
    </div>
  )
}
```

**Time: 3 hours**

---

### **6. Task Archive View**

**Why:** Users want to see what they've accomplished.

**Implementation:**

**Step 1: Add Tab Navigation**
```typescript
// /app/app/page.tsx
'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function AppPage() {
  const { profile } = useProfile()
  const t = useTranslation(profile.preferredLanguage)
  
  return (
    <div className="container mx-auto p-6">
      <Tabs defaultValue="active">
        <TabsList className="mb-6">
          <TabsTrigger value="active">
            {t.tabs?.active || "Active Tasks"}
          </TabsTrigger>
          <TabsTrigger value="completed">
            {t.tabs?.completed || "Completed"}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active">
          <ActiveTasks />
        </TabsContent>
        
        <TabsContent value="completed">
          <CompletedTasks />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**Step 2: Completed Tasks Component**
```typescript
// /components/CompletedTasks.tsx
'use client'

import { useEffect, useState } from 'react'
import { TaskCard } from './TaskCard'
import { Button } from './ui/button'

export function CompletedTasks() {
  const [tasks, setTasks] = useState([])
  
  useEffect(() => {
    fetch('/api/tasks?status=completed')
      .then(r => r.json())
      .then(setTasks)
  }, [])
  
  const handleRestore = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' })
    })
    
    // Refresh list
    const updated = tasks.filter(t => t.id !== taskId)
    setTasks(updated)
  }
  
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No completed tasks yet. Keep going! 🚀
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {tasks.map(task => (
        <div key={task.id} className="relative">
          <TaskCard task={task} readonly />
          
          <div className="absolute top-4 right-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleRestore(task.id)}
            >
              Restore
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

**Step 3: Update Task API**
```typescript
// /app/api/tasks/route.ts
export async function GET(request: Request) {
  const { user } = await getUser(request)
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'active'
  
  const tasks = await prisma.task.findMany({
    where: {
      profileId: user.profile.id,
      status: status  // 'active' | 'completed' | 'archived'
    },
    include: {
      steps: {
        orderBy: { order: 'asc' }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  })
  
  return Response.json(tasks)
}
```

**Time: 5 hours**

---

**WEEK 2 TOTAL: 26 hours**

**Deliverable:** Multi-language support, step refresh, progress tracking, better onboarding, archive view.

---

## 👥 WEEK 3: GET REAL USERS (March 17-23)

**Goal:** 10 people using Fluye by end of week.

### **User Acquisition Strategy**

**1. Direct Outreach (Target: 5 users)**

**Who:**
- 2-3 friends/coworkers with ADHD
- 2 friends without ADHD but with task overwhelm

**How:**
```
Hey [name]! 

I built a tool that breaks down overwhelming tasks into bite-sized steps. 

Like, you write "prepare presentation" and it asks you a few questions, then gives you concrete 5-minute actions you can actually tick off.

Would you try it for a week? I need honest feedback from real users. Takes 2 min to sign up.

[link to fluye.vercel.app]

- Daniel
```

**Follow-up:**
- Day 3: "How's it going? Any confusion?"
- Day 7: 15-min call for feedback

---

**2. Chilean Tech Community (Target: 3 users)**

**Where:**
- Chilean dev Slack/Discord communities
- LinkedIn post

**Post (Spanish):**
```
🚀 Hice una app para TDAH que traduce tareas vagas a pasos concretos

Problema: Escribes "arreglar el bug" y te quedas paralizado porque no sabes por dónde empezar.

Solución: Fluye te hace preguntas, usa tu contexto, y te da pasos de 5 minutos que puedes completar.

Características:
✅ Interfaz en español
✅ AI que entiende tu rol técnico
✅ Gratis (por ahora)

Busco beta testers. ¿Alguien se anima?

[link]
```

---

**3. ADHD Communities (Target: 2 users)**

**Where:**
- r/ADHD
- ADHD Twitter

**Post:**
```
I built a free tool for ADHD task paralysis [seeking beta testers]

If you've ever written "work on project" in your todo list and then stared at it frozen, this might help.

What it does:
- You paste vague tasks
- It asks clarifying questions
- Breaks them into specific 5-minute steps
- You check them off (dopamine hit ✓)

Free during beta. Looking for honest feedback.

[link]
```

---

### **Feedback Collection**

**In-App Prompt (after 3rd task breakdown):**
```typescript
// Show modal after user's 3rd breakdown
<FeedbackModal>
  <h3>Quick feedback?</h3>
  <p>You've used Fluye 3 times. Help me make it better:</p>
  
  <textarea placeholder="What would make you use this daily?" />
  
  <Button>Send Feedback</Button>
  <Button variant="ghost">Maybe later</Button>
</FeedbackModal>
```

**Google Form (sent after 1 week):**
```
Fluye Beta Feedback

1. What task did you try to break down?
2. Did the AI breakdown actually help? (1-5 scale)
3. What would make you use this daily?
4. What almost made you quit using it?
5. Would you pay $5/month for this?
6. Any bugs or confusion?

Thanks! - Daniel
```

---

### **Support & Monitoring**

**Set up:**
- Error tracking (Sentry or similar)
- Usage analytics (Posthog or Vercel Analytics)
- Support email: hello@fluye.app

**Monitor daily:**
- New signups
- Task breakdowns created
- Error rates
- User feedback

**Time: 10 hours** (mostly waiting, some support)

---

## 🔄 WEEK 4: ITERATE (March 24-30)

**This week is data-driven.** Build what users actually ask for.

### **Likely Scenarios**

**Scenario A: Users love it, minor tweaks needed**
- Fix top 3 user complaints
- Polish rough edges
- Write Substack post: "10 people used Fluye - here's what I learned"
- Prepare for public launch

**Scenario B: Users want a specific feature**
- Time tracking (if 5+ users request it)
- OR better AI prompts (if breakdowns are too generic)
- OR something unexpected

**Scenario C: Users aren't using it**
- **Pivot point.** Deep dive on why.
- Is the core value prop wrong?
- Is onboarding confusing?
- Is the AI not good enough?
- Decision: fix vs. pivot vs. pause

---

### **Planned Work (if Scenario A)**

**1. Top User Complaints (8 hours)**
- Fix based on actual feedback
- Could be: UI confusion, slow AI, bugs, etc.

**2. Polish Pass (4 hours)**
- Animation improvements
- Error message clarity
- Loading state polish

**3. Documentation (3 hours)**
- Update README with screenshots
- Write "How to Use" guide
- Record demo video (2 min)

**4. Substack Post (5 hours)**
```markdown
# I Shipped My First SaaS: 10 Users, 4 Weeks, Lessons Learned

## The Journey
- Week 1: Won 92/100 in hackathon
- Week 2: Fixed security holes
- Week 3: Added Spanish + features users wanted
- Week 4: Got 10 real users

## What Worked
- [Data from real usage]

## What Didn't
- [Honest failures]

## What's Next
- [Public launch? Monetization? Pivot?]

## For Other Builders
- [Advice based on lessons learned]
```

**Time: 20 hours**

---

## 📊 V2 SUCCESS METRICS

By March 30, we've succeeded if:

1. ✅ **All security fixes deployed** (Week 1)
2. ✅ **Spanish + English working** (Week 2)
3. ✅ **10 real users signed up** (Week 3)
4. ✅ **50+ tasks broken down total** (Week 3-4)
5. ✅ **3+ users say they'd pay** (Week 3-4)
6. ✅ **You're still using it daily** (Weeks 1-4)

**Decision points:**
- If we hit all 6 → Fluye is a real product. Consider public launch + monetization.
- If we hit 4-5 → Promising. Iterate another 2-4 weeks.
- If we hit <4 → Honest retrospective. Pivot or pause?

---

## 🚫 WHAT WE'RE NOT BUILDING (YET)

These wait until we validate core product:

❌ **Stripe payments** - Wait for 10 active users who say they'd pay
❌ **Weekly/monthly planning** - Keep it simple, daily tasks only
❌ **Team collaboration** - Solo users first
❌ **Mobile app** - Responsive web is enough  
❌ **Advanced AI** (pattern learning, etc.) - Need 100+ tasks first
❌ **Integrations** (Notion, Todoist, etc.) - Not until PMF
❌ **Time tracking per step** - Only if users explicitly request it

**Why wait?** Premature optimization. Validate people want THIS before building MORE.

---

## 📋 IMPLEMENTATION CHECKLIST

**Week 1: Security (Must Do)**
- [ ] Step ownership check (2h)
- [ ] Rate limiting to database (4h)
- [ ] AI validation with Zod (4h)
- [ ] Rename userId → profileId (2h)
- [ ] Align documentation (1h)

**Week 2: Features (Must Do)**
- [ ] Multi-language (Spanish + English) (8h)
- [ ] Step refresh/regenerate (5h)
- [ ] Progress bar (2h)
- [ ] "Why these steps?" explainer (3h)
- [ ] Empty states (3h)
- [ ] Archive view (5h)

**Week 3: Users (Must Do)**
- [ ] Reach out to 5 friends (2h)
- [ ] Post in Chilean communities (2h)
- [ ] Post in ADHD communities (1h)
- [ ] Set up feedback collection (2h)
- [ ] Support & monitoring (3h/day × 7 days)

**Week 4: Iterate (Data-Driven)**
- [ ] Fix top 3 complaints (8h)
- [ ] Polish pass (4h)
- [ ] Documentation (3h)
- [ ] Substack post (5h)

---

## 🚀 GETTING STARTED

**This week (by March 9):**

1. **Create GitHub Issues** for Week 1 tasks
2. **Start with easiest fix:** Documentation alignment (builds momentum)
3. **Then tackle hardest:** Rate limiting to database (highest ROI)
4. **Update Notion** with this V2 plan
5. **Write Substack teaser:** "Fluye V2 - Making it Production-Ready"

**First code you write:**
```bash
# Create new branch
git checkout -b v2-security-fixes

# Start with rate limiting
# Update Prisma schema, migrate, update API routes

# Commit early, commit often
git commit -m "feat: add clarify rate limit to database"
```

---

## 💭 FINAL THOUGHTS

**You shipped in 48 hours. That was the hard part.**

V2 is about refinement, not revolution. You already have:
- ✅ Working product
- ✅ Judge validation (92/100)
- ✅ Clear roadmap
- ✅ First piece of Shadow Platform

Now it's execution. 4 weeks. Ship > perfect.

**The goal isn't to build the ultimate ADHD tool.**  
**The goal is to get 10 people using something that helps them.**

If you do that, you'll have more data than 99% of side projects ever get.

**Let's build. 🚀**