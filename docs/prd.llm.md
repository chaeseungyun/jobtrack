# JobTrack - Technical Specification (LLM Agent Guide)

## Agent Instructions

This document is designed for AI agents/assistants working on the JobTrack project. **Read this first** before any implementation task.

**CRITICAL RULES:**
1. Always check existing code patterns before introducing new ones
2. Never use `any` type in TypeScript - define proper interfaces
3. Never commit secrets or `.env` files
4. Follow the exact technology stack specified below
5. When unsure, prefer the simpler solution that matches existing patterns

---

## 1. Project Overview

### 1.1 Quick Facts
- **Project Type**: Fullstack web application (SSR/SSG)
- **Purpose**: Job application tracking board for job seekers
- **Target User**: Single user initially, authentication required for future multi-user support
- **Timeline**: 2-3 days MVP
- **Success Metric**: Zero API errors reported for 7 days post-deployment

### 1.2 Core Value Proposition
**"Never miss a deadline and visualize your entire job search pipeline"**

Key Problems Solved:
- Missing application deadlines scattered across multiple job sites
- Losing track of which stage each application is in
- Scattered information (emails, notes, spreadsheets)

---

## 2. Technology Stack (DO NOT CHANGE)

### 2.1 Required Stack
```
Frontend:    Next.js 14 (App Router)
UI Library:  shadcn/ui (Tailwind CSS + Radix UI)
Package Manager: pnpm
Backend:     Next.js API Routes
Database:    Supabase (PostgreSQL)
Storage:     Supabase Storage
Email:       Resend
Deployment:  Vercel
Scheduler:   Vercel Cron Jobs
Auth:        JWT (jsonwebtoken) + bcrypt
```

### 2.2 Why This Stack
- **Next.js + Vercel**: Single framework for frontend and API, zero-config deployment
- **shadcn/ui**: Headless UI components with Tailwind, full customization, zero runtime overhead
- **Supabase**: PostgreSQL + Auth + Storage in one platform, generous free tier
- **Resend**: 100 emails/day free, developer-friendly API
- **Vercel Cron**: Native scheduling for notification batch jobs

### 2.3 Key Constraints
- Free tier usage only (unless explicitly approved)
- Single-user authentication initially
- Email notifications only (no push notifications)
- PDF files only for uploads
- shadcn/ui components must follow design guidelines
- Use pnpm for dependency and script management

### 2.4 shadcn/ui Guidelines

#### Component Installation
```bash
# Only install components listed in section 2.5
pnpm dlx shadcn@latest add <component-name>

# All components go to: components/ui/
# Never modify node_modules - components are copied to your codebase
```

#### Design System
```typescript
// Color palette (Tailwind classes)
const colors = {
  primary: 'slate-600',      // Neutral, professional
  accent: 'blue-600',        // Information, actions
  success: 'emerald-600',    // Acceptance, completion
  warning: 'amber-600',      // Approaching, caution
  danger: 'red-600',         // Rejection, error
}

// Component variants follow shadcn/ui patterns
// Use cn() utility for conditional class merging
// Example: cn("base-classes", condition && "conditional-classes")
```

#### Key Components Available
| Component | Location | Usage |
|-----------|----------|-------|
| Button | components/ui/button.tsx | Actions, form submission |
| Card | components/ui/card.tsx | Content containers |
| Badge | components/ui/badge.tsx | Status indicators |
| Dialog | components/ui/dialog.tsx | Modals, confirmations |
| Input | components/ui/input.tsx | Form text inputs |
| Label | components/ui/label.tsx | Form labels |
| Select | components/ui/select.tsx | Dropdown selections |
| Textarea | components/ui/textarea.tsx | Multi-line text |
| Tabs | components/ui/tabs.tsx | Content organization |
| Separator | components/ui/separator.tsx | Visual dividers |
| Avatar | components/ui/avatar.tsx | User representation |
| DropdownMenu | components/ui/dropdown-menu.tsx | Context menus |
| Toast | components/ui/sonner.tsx | Notifications |

---

## 3. Database Schema

### 3.1 Tables

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
- `email` (unique constraint)

---

#### applications
```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  position VARCHAR(255) NOT NULL,
  career_type VARCHAR(20) NOT NULL CHECK (career_type IN ('new', 'experienced', 'any')),
  job_url VARCHAR(500),
  source VARCHAR(50) CHECK (source IN ('saramin', 'jobkorea', 'company', 'linkedin', 'etc')),
  merit_tags JSONB DEFAULT '[]',
  current_stage VARCHAR(20) NOT NULL DEFAULT 'interest' 
    CHECK (current_stage IN ('interest', 'applied', 'document_pass', 'assignment', 'interview', 'final_pass', 'rejected')),
  company_memo TEXT,
  cover_letter TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_applications_user_stage ON applications(user_id, current_stage);
CREATE INDEX idx_applications_user_created ON applications(user_id, created_at DESC);
```

**Enums:**
- `career_type`: 'new' (신입), 'experienced' (경력), 'any' (경력무관)
- `current_stage`: 'interest', 'applied', 'document_pass', 'assignment', 'interview', 'final_pass', 'rejected'
- `source`: 'saramin', 'jobkorea', 'company', 'linkedin', 'etc'

**merit_tags preset values (max 3):**
```json
["high_salary", "flexible_hours", "remote_work", "free_lunch", "stock_options", "growth_potential", "work_life_balance"]
```

---

#### events
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('deadline', 'result', 'interview')),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(500),
  interview_round INTEGER,
  notified_d3 BOOLEAN DEFAULT FALSE,
  notified_d1 BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_events_scheduled ON events(scheduled_at);
CREATE INDEX idx_events_application ON events(application_id, event_type);
CREATE INDEX idx_events_notified ON events(notified_d3, notified_d1, scheduled_at);
```

**Logic Notes:**
- `interview_round` only used when `event_type` = 'interview'
- Notification flags prevent duplicate emails

---

#### documents
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Storage:**
- Files stored in Supabase Storage
- `file_url` is the public/storage URL from Supabase
- Max file size: 10MB
- Allowed types: PDF only

---

## 4. API Specification

### 4.1 Authentication

#### POST /api/auth/register
```typescript
// Request
{
  email: string;      // valid email format
  password: string;   // min 8 characters
}

// Response 201
{
  user: {
    id: string;
    email: string;
  };
}
// Also sets httpOnly cookie: jobtrack_auth

// Response 400 - Validation error
// Response 409 - Email already exists
```

#### POST /api/auth/login
```typescript
// Request
{
  email: string;
  password: string;
}

// Response 200
{
  user: {
    id: string;
    email: string;
  };
}
// Also sets httpOnly cookie: jobtrack_auth

// Response 401 - Invalid credentials
```

#### POST /api/auth/logout
```typescript
// Auth: httpOnly cookie (jobtrack_auth)
// Response 200
{ message: "Logged out successfully" }
```

---

### 4.2 Applications

#### GET /api/applications
```typescript
// Auth: httpOnly cookie (jobtrack_auth)
// Query params (optional): stage, search

// Response 200
{
  applications: [
    {
      id: string;
      company_name: string;
      position: string;
      career_type: 'new' | 'experienced' | 'any';
      current_stage: string;
      job_url: string | null;
      source: string | null;
      merit_tags: string[];
      created_at: string;
      updated_at: string;
      upcoming_event?: {
        type: string;
        scheduled_at: string;
      } | null;
    }
  ]
}
```

#### GET /api/applications/[id]
```typescript
// Response 200
{
  id: string;
  company_name: string;
  position: string;
  career_type: 'new' | 'experienced' | 'any';
  job_url: string | null;
  source: string | null;
  merit_tags: string[];
  current_stage: string;
  company_memo: string | null;
  cover_letter: string | null;
  events: [
    {
      id: string;
      event_type: 'deadline' | 'result' | 'interview';
      scheduled_at: string;
      location: string | null;
      interview_round: number | null;
    }
  ];
  documents: [
    {
      id: string;
      file_name: string;
      file_url: string;
      file_size: number;
    }
  ];
  created_at: string;
  updated_at: string;
}
```

#### POST /api/applications
```typescript
// Request
{
  company_name: string;     // required
  position: string;         // required
  career_type: 'new' | 'experienced' | 'any';  // required
  job_url?: string;
  source?: 'saramin' | 'jobkorea' | 'company' | 'linkedin' | 'etc';
  merit_tags?: string[];    // max 3 from preset list
  current_stage?: string;   // default: 'interest'
  company_memo?: string;
  cover_letter?: string;
  deadline?: string;        // ISO 8601 datetime (optional, creates deadline event)
}

// Response 201 - Created application object
// Response 400 - Validation error
// Response 401 - Unauthorized
```

#### PATCH /api/applications/[id]
```typescript
// Request - partial update
{
  company_name?: string;
  position?: string;
  career_type?: 'new' | 'experienced' | 'any';
  current_stage?: string;
  // ... other fields
}

// Response 200 - Updated application
// Response 404 - Not found
```

#### DELETE /api/applications/[id]
```typescript
// Response 204 - No content
// Response 404 - Not found
```

---

### 4.3 Events

#### POST /api/applications/[id]/events
```typescript
// Request
{
  event_type: 'deadline' | 'result' | 'interview';
  scheduled_at: string;     // ISO 8601 datetime (required)
  location?: string;        // For interviews
  interview_round?: number; // For interviews only
}

// Response 201 - Created event
// Response 400 - Validation error
```

#### PATCH /api/events/[id]
```typescript
// Request - partial update
{
  scheduled_at?: string;
  location?: string;
  interview_round?: number;
}

// Response 200 - Updated event
```

#### DELETE /api/events/[id]
```typescript
// Response 204 - No content
```

---

### 4.4 Documents

#### POST /api/applications/[id]/documents
```typescript
// Request: multipart/form-data
// Field: file (PDF, max 10MB)

// Response 201
{
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  created_at: string;
}

// Response 400 - Invalid file type or size
// Response 413 - File too large
```

#### DELETE /api/documents/[id]
```typescript
// Response 204 - No content
// Note: Also deletes from Supabase Storage
```

---

### 4.5 Dashboard

#### GET /api/dashboard
```typescript
// Auth: httpOnly cookie (jobtrack_auth)

// Response 200
{
  stats: {
    total_applications: number;
    document_pass_count: number;
    interview_count: number;
  };
  upcoming: {
    deadlines: Array<{
      application_id: string;
      company_name: string;
      scheduled_at: string;
      days_left: number;
    }>;
    results: Array<{
      application_id: string;
      company_name: string;
      scheduled_at: string;
      days_left: number;
    }>;
    interviews: Array<{
      application_id: string;
      company_name: string;
      scheduled_at: string;
      location: string;
      interview_round: number;
      days_left: number;
    }>;
  };
}
```

**Logic:**
- Return events within next 7 days
- Sort by `scheduled_at` ascending
- Limit: 5 items per category

---

## 5. Frontend Structure

### 5.1 Page Routes

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/login` | Login form | No |
| `/register` | Registration form | No |
| `/dashboard` | Main dashboard with stats and upcoming events | Yes |
| `/board` | Kanban board view | Yes |
| `/applications/new` | New application form | Yes |
| `/applications/[id]` | Application detail view | Yes |
| `/applications/[id]/edit` | Edit application form | Yes |

### 5.2 Component Guidelines

**Layout Components:**
```
app/
├── layout.tsx           # Root layout with auth provider
├── page.tsx             # Redirects to /dashboard or /login
├── (auth)/              # Auth routes (no layout sidebar)
│   ├── login/page.tsx
│   └── register/page.tsx
├── (app)/               # App routes (with sidebar layout)
│   ├── layout.tsx       # App layout with sidebar, auth check
│   ├── dashboard/page.tsx
│   ├── board/page.tsx
│   └── applications/
│       ├── new/page.tsx
│       └── [id]/
│           ├── page.tsx
│           └── edit/page.tsx
```

**Key Components:**

```typescript
// components/kanban/KanbanBoard.tsx
// Drag-and-drop or click-to-move stage transitions
// Uses: Card, Badge, Button from shadcn/ui
// Props: applications[], onStageChange(applicationId, newStage)

// components/dashboard/StatsCard.tsx
// Display metric with icon
// Uses: Card from shadcn/ui
// Props: title, value, icon, color

// components/dashboard/UpcomingEvents.tsx
// List upcoming deadlines/results/interviews
// Uses: Card, Badge, Separator from shadcn/ui
// Props: events[], type

// components/forms/ApplicationForm.tsx
// Create/edit application form
// Uses: Input, Textarea, Select, Label, Button from shadcn/ui
// Props: initialData?, onSubmit

// components/ui/StageBadge.tsx
// Display stage with color coding
// Uses: Badge from shadcn/ui with custom variants
// Props: stage (enum value)
```

**Stage Color Mapping (using shadcn/ui Badge variants):**
```typescript
const stageBadgeVariants = {
  interest: 'secondary',        // gray
  applied: 'default',           // blue
  document_pass: 'success',     // green
  assignment: 'warning',        // yellow
  interview: 'purple',          // custom - purple
  final_pass: 'success',        // green (emphasized)
  rejected: 'destructive',      // red
};

// For custom colors beyond shadcn defaults:
const stageColors = {
  interest: 'bg-gray-100 text-gray-800 border-gray-200',
  applied: 'bg-blue-100 text-blue-800 border-blue-200',
  document_pass: 'bg-green-100 text-green-800 border-green-200',
  assignment: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  interview: 'bg-purple-100 text-purple-800 border-purple-200',
  final_pass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
};
```

### 5.3 shadcn/ui Component Usage Patterns

#### Form Pattern
```typescript
// Always use with React Hook Form + Zod
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  position: z.string().min(1, "Position is required"),
});

export function ApplicationForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="company_name">Company Name</Label>
          <Input id="company_name" {...form.register("company_name")} />
        </div>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
```

#### Dialog Pattern
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

<Dialog>
  <DialogTrigger asChild>
    <Button>Add Event</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>New Event</DialogTitle>
    </DialogHeader>
    {/* Form content */}
  </DialogContent>
</Dialog>
```

#### Card Pattern
```typescript
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Application Summary</CardTitle>
    <CardDescription>Overview of your job search</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

---

## 6. Notification System

### 6.1 Email Templates

**D-3 Reminder:**
```
Subject: [JobTrack] {event_type} in 3 days - {company_name}

Hello,

Your {event_type} for {company_name} {position} is scheduled in 3 days.

Schedule: {scheduled_at}
Location/Link: {location || 'TBD'}

Manage application: {app_url}/applications/{application_id}

JobTrack
```

**D-1 Reminder:**
```
Subject: [JobTrack] {event_type} tomorrow - {company_name} ⚠️

Hello,

Your {event_type} for {company_name} {position} is scheduled for tomorrow.

Schedule: {scheduled_at}
Location/Link: {location || 'TBD'}

Manage application: {app_url}/applications/{application_id}

JobTrack
```

### 6.2 Scheduler Implementation

**Vercel Cron Job:**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/notifications",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Cron Handler Logic:**
```typescript
// app/api/cron/notifications/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const now = new Date();
  const d3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const d1 = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

  // Find D-3 events not notified
  const d3Events = await db.query(`
    SELECT e.*, a.company_name, a.position, u.email
    FROM events e
    JOIN applications a ON e.application_id = a.id
    JOIN users u ON a.user_id = u.id
    WHERE e.notified_d3 = false
    AND DATE(e.scheduled_at) = DATE($1)
  `, [d3]);

  // Find D-1 events not notified
  const d1Events = await db.query(`
    SELECT e.*, a.company_name, a.position, u.email
    FROM events e
    JOIN applications a ON e.application_id = a.id
    JOIN users u ON a.user_id = u.id
    WHERE e.notified_d1 = false
    AND DATE(e.scheduled_at) = DATE($1)
  `, [d1]);

  // Send emails and update flags
  // ... Resend API calls

  return Response.json({ 
    d3_sent: d3Events.length, 
    d1_sent: d1Events.length 
  });
}
```

---

## 7. Environment Variables

### 7.1 Required Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Authentication
JWT_SECRET=your-random-jwt-secret-min-32-chars

# Resend Email
RESEND_API_KEY=re_xxxx
RESEND_FROM_EMAIL=notifications@yourdomain.com

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
CRON_SECRET=your-cron-secret-key
```

### 7.2 Security Rules

- NEVER commit `.env` files
- Use `JWT_SECRET` min 32 characters
- Use `SUPABASE_SERVICE_ROLE_KEY` only in server-side API routes
- Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side (limited permissions)

---

## 8. TypeScript Types

### 8.1 Core Types

```typescript
// types/index.ts

export type CareerType = 'new' | 'experienced' | 'any';

export type ApplicationStage = 
  | 'interest' 
  | 'applied' 
  | 'document_pass' 
  | 'assignment' 
  | 'interview' 
  | 'final_pass' 
  | 'rejected';

export type EventType = 'deadline' | 'result' | 'interview';

export type Source = 'saramin' | 'jobkorea' | 'company' | 'linkedin' | 'etc';

export type MeritTag = 
  | 'high_salary' 
  | 'flexible_hours' 
  | 'remote_work' 
  | 'free_lunch' 
  | 'stock_options' 
  | 'growth_potential' 
  | 'work_life_balance';

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  company_name: string;
  position: string;
  career_type: CareerType;
  job_url: string | null;
  source: Source | null;
  merit_tags: MeritTag[];
  current_stage: ApplicationStage;
  company_memo: string | null;
  cover_letter: string | null;
  created_at: string;
  updated_at: string;
  events?: Event[];
  documents?: Document[];
}

export interface Event {
  id: string;
  application_id: string;
  event_type: EventType;
  scheduled_at: string;
  location: string | null;
  interview_round: number | null;
  notified_d3: boolean;
  notified_d1: boolean;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  application_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  created_at: string;
}

export interface DashboardStats {
  total_applications: number;
  document_pass_count: number;
  interview_count: number;
}

export interface UpcomingEvent {
  application_id: string;
  company_name: string;
  scheduled_at: string;
  days_left: number;
  location?: string;
  interview_round?: number;
}

export interface DashboardData {
  stats: DashboardStats;
  upcoming: {
    deadlines: UpcomingEvent[];
    results: UpcomingEvent[];
    interviews: UpcomingEvent[];
  };
}
```

---

## 9. Development Checklist

### 9.1 Day 1 Tasks
- [ ] Initialize Next.js 14 project with Tailwind
- [ ] Initialize shadcn/ui and install required components
- [ ] Setup Supabase project and run migrations
- [ ] Create environment variables
- [ ] Implement authentication (register/login/logout)
- [ ] Create application CRUD APIs
- [ ] Build application forms using shadcn/ui components

### 9.2 Day 2 Tasks
- [ ] Implement Kanban board with stage transitions
- [ ] Build dashboard with stats and upcoming events
- [ ] Implement file upload/download with Supabase Storage
- [ ] Create event management (deadline/result/interview)

### 9.3 Day 3 Tasks
- [ ] Setup Resend email integration
- [ ] Implement notification cron job
- [ ] Deploy to Vercel
- [ ] Test with real data (20-30 applications)
- [ ] Fix any critical bugs

### 9.4 Pre-Deployment Checklist
- [ ] All API endpoints tested with curl/Postman
- [ ] Authentication flows working (login/logout/register)
- [ ] File upload/download working
- [ ] Email notifications sending correctly
- [ ] Cron job configured and tested
- [ ] Environment variables set in Vercel dashboard
- [ ] Database indexes created
- [ ] All shadcn/ui components styled consistently

---

## 10. Common Patterns

### 10.1 Database Query Pattern

```typescript
// lib/db.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Server-side only
);

export async function getApplications(userId: string) {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      events (*),
      documents (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
```

### 10.2 API Route Pattern

```typescript
// app/api/applications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { createApplication } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const token = request.cookies.get('jobtrack_auth')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Validate input
    const body = await request.json();
    const { company_name, position, career_type } = body;
    
    if (!company_name || !position || !career_type) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    // Create application
    const application = await createApplication({
      ...body,
      user_id: user.id,
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
```

### 10.3 Client-Side Data Fetching

```typescript
// hooks/useApplications.ts
import useSWR from 'swr';

const fetcher = (url: string) =>
  fetch(url, {
    credentials: 'include',
  }).then(res => res.json());

export function useApplications() {
  const { data, error, mutate } = useSWR('/api/applications', fetcher);
  
  return {
    applications: data?.applications,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
```

### 10.4 shadcn/ui Custom Component Pattern

```typescript
// components/ui/StageBadge.tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ApplicationStage } from "@/types";\n
interface StageBadgeProps {
  stage: ApplicationStage;
  className?: string;
}

const stageStyles: Record<ApplicationStage, string> = {
  interest: "bg-gray-100 text-gray-800 border-gray-200",
  applied: "bg-blue-100 text-blue-800 border-blue-200",
  document_pass: "bg-green-100 text-green-800 border-green-200",
  assignment: "bg-yellow-100 text-yellow-800 border-yellow-200",
  interview: "bg-purple-100 text-purple-800 border-purple-200",
  final_pass: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

const stageLabels: Record<ApplicationStage, string> = {
  interest: "Interest",
  applied: "Applied",
  document_pass: "Document Pass",
  assignment: "Coding Test/Assignment",
  interview: "Interview",
  final_pass: "Final Acceptance",
  rejected: "Rejected",
};

export function StageBadge({ stage, className }: StageBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={cn(stageStyles[stage], className)}
    >
      {stageLabels[stage]}
    </Badge>
  );
}
```

---

## 11. Error Handling

### 11.1 HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | GET success |
| 201 | POST/PUT success (created/updated) |
| 204 | DELETE success |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (permission denied) |
| 404 | Not found |
| 413 | Payload too large (file upload) |
| 500 | Server error |

### 11.2 Error Response Format

```typescript
{
  error: string;        // Human-readable error message
  code?: string;        // Optional error code for client handling
  details?: unknown;    // Optional additional details
}
```

---

## 12. Performance Guidelines

### 12.1 Database
- Always use indexes for filtered queries
- Limit large result sets (pagination)
- Use `select()` with specific columns when possible

### 12.2 API
- Enable Next.js caching for read-heavy endpoints
- Use `revalidate` for dashboard data (ISR)
- Keep response payload under 100KB

### 12.3 Frontend
- Use `Suspense` and loading states
- Implement optimistic updates for mutations
- Lazy load heavy components (Kanban)
- Use shadcn/ui components (already optimized)

---

## 13. Security Checklist

- [ ] Passwords hashed with bcrypt (cost factor 10+)
- [ ] JWT tokens signed with strong secret
- [ ] CORS configured properly
- [ ] Rate limiting on auth endpoints
- [ ] File upload type/size validation
- [ ] SQL injection prevention (use parameterized queries)
- [ ] XSS protection (escape user input in templates)
- [ ] Cron endpoint protected with secret

---

## 14. Testing Strategy

### 14.1 Manual Testing
- Create 20-30 test applications
- Test all stage transitions
- Verify email notifications
- Test file upload/download

### 14.2 Edge Cases
- Empty state (no applications)
- Very long company names
- Special characters in inputs
- Large PDF files (>10MB)
- Concurrent edits

---

## 15. shadcn/ui Installation Commands

```bash
# Initialize shadcn/ui (run once after Next.js setup)
pnpm dlx shadcn@latest init

# Install all required components
pnpm dlx shadcn@latest add button card badge dialog input label select textarea tabs separator avatar dropdown-menu toast

# Components will be available at:
# - components/ui/button.tsx
# - components/ui/card.tsx
# - components/ui/badge.tsx
# - ... etc
```

---

**Last Updated**: 2026-02-13
**Version**: 1.0 (MVP)
**Next Review**: Post-deployment (7 days)
