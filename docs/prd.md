# JobTrack - Job Application & Interview Schedule Management Board

## 1. Project Overview

### 1.1 Project Name
JobTrack (Working Title: JobQuest)

### 1.2 One-Line Description
An integrated management board that oversees the entire process from job application writing to final acceptance, ensuring you never miss important deadlines, announcement dates, or interview schedules through automated notifications.

### 1.3 Problem Definition (Why)

#### Real-World Problems
- **Missed Deadlines**: Frequently missing application deadlines or interview schedules because information is scattered across multiple job sites (Saramin, JobKorea, company career pages)
- **Difficulty Tracking Status**: Hard to see at a glance which stage each application is in when managing 10, 20+ companies
- **Information Scattered**: Company research, interview prep, contact info scattered across notes, Excel, emails, and KakaoTalk
- **Repeated Mistakes**: Making the same mistakes in interviews or accidentally re-applying to the same company because you can't track what you've already done

#### Target Users
- **Primary Target**: Job seekers who have started their job search (new graduates and experienced hires)
- **Secondary Target**: Current employees preparing to switch jobs (future expansion)

#### Success Metrics
1. **Usability**: 0% missed application deadlines
2. **Retention**: 3+ visits per week (checking/updating schedules)
3. **Quality**: Zero API error reports for 7 days post-deployment

---

## 2. MVP Scope Definition

### 2.1 MVP Core Goal (2-3 Day Development)
**"Never miss an application deadline and visualize your entire job search progress at a glance"**

### 2.2 Included Features (Essential)
| Feature | Description | Rationale |
|---------|-------------|-----------|
| **Account Management** | Email/password login | Integrate notification channel (email) with account for operational simplicity. Email chosen over username for password reset, uniqueness, and scalability |
| **Application CRUD** | Register/view/edit/delete company application info | Core data. Start managing from the moment you apply |
| **Kanban Board** | Interest → Applied → Document Pass → Coding Test/Assignment → Nth Interview → Final Acceptance | Visualize progress by stage. Interview rounds handled as numeric fields for structural simplicity |
| **Schedule Management** | Register and get alerts for deadlines, announcement dates, and interviews | D-3, D-1 email alerts to prevent actual missed deadlines (per user requirements) |
| **Dashboard** | Total applications, acceptance status, upcoming schedules | Essential for motivation and priority judgment |
| **File Management** | Resume/portfolio PDF upload | Manage required documents in one place |

### 2.3 Excluded Features (Post v1.1)
| Feature | Exclusion Reason |
|---------|-----------------|
| Template Auto-Generation | Exceeds MVP development scope. Memo feature serves as alternative |
| Multi-user/Team Sharing | Outside single-user MVP scope |
| Mobile App | Implement responsive web first. App decided after usability validation |
| Statistics/Reports | Dashboard basic metrics sufficient |
| External Calendar Integration (Google/Apple) | Schedule alerts covered by email. Low ROI for complexity |

---

## 3. User Experience (UX) Definition

### 3.1 User Scenarios

#### Scenario 1: Discovering a New Job Posting
1. Find new posting on Saramin
2. Access JobTrack and click "Add New Application"
3. Enter company name, position, deadline, and job posting URL
4. Save with stage: "Interest"
5. Verify it appears on Dashboard under "This Week's Deadlines"

#### Scenario 2: Status Update After Application
1. Complete actual application on company website
2. Find the application in JobTrack
3. Move stage to "Applied"
4. Upload application confirmation email as PDF
5. Save cover letter content in memo field

#### Scenario 3: Interview Schedule Registration & Alerts
1. Receive document pass email
2. Change stage to "Document Pass" in JobTrack
3. Register interview schedule (date, time, location/link)
4. System automatically sends email alerts at D-3 and D-1
5. Review preparation notes before interview

#### Scenario 4: Weekly Planning
1. Access dashboard
2. Check interview/deadline schedules in "This Week's Schedule" panel
3. Plan preparation priorities accordingly
4. Check pending applications on Kanban board

### 3.2 Core Screen Structure

| Screen | Description | Core Features |
|--------|-------------|---------------|
| **Login/Register** | Email/password based auth | JWT token auth, password encryption |
| **Dashboard (Main)** | Overall status and this week's schedule | Total applications, stage statistics, 5 upcoming schedules |
| **Kanban Board** | Application management by stage | Drag-and-drop or stage change, application card display |
| **Application Detail** | Individual application info and history | Info edit, event (schedule) management, file upload, memo |
| **New Application** | New application registration form | Required/optional field separation, quick registration |

### 3.3 Information Architecture (IA)

```
JobTrack
├── Auth
│   ├── Login
│   └── Register
├── Dashboard (Main Page)
│   ├── Summary Cards (Total/Document Pass/Interviewing)
│   ├── Upcoming Schedules (Deadlines/Announcements/Interviews)
│   └── Quick Navigation (New Application/Board)
├── Kanban Board
│   ├── Stage Columns (Interest ~ Final Acceptance)
│   ├── Application Cards
│   └── Filter/Sort
└── Application Management
    ├── Application List
    ├── New/Edit Application
    └── Application Detail
        ├── Basic Info
        ├── Event (Schedule) Management
        ├── File Attachments
        └── Memo/Cover Letter
```

---

## 4. Feature Details

### 4.1 Authentication System

#### Email-Based Login Rationale
**Comparison of Options:**
| Method | Pros | Cons | Decision |
|--------|------|------|----------|
| **Email (Selected)** | Easy password reset, integrated notification channel, duplicate prevention | Longer input | **Selected** - Operational simplicity priority |
| Username | Shorter input, anonymity | Difficult recovery if password lost, separate notification channel needed | Lower priority |
| Social Login (Google) | High convenience | Increased implementation complexity, exceeds MVP scope | v1.1 consideration |

#### Requirements
- JWT-based authentication (Access Token)
- Password bcrypt hashing (security requirement)
- Auto-login (local storage token persistence)

### 4.2 Application Data Model

#### Required Fields (Mandatory)
| Field | Type | Description |
|-------|------|-------------|
| Company Name | String | Name of company applied to |
| Position | String | Job title/position applied for |
| Career Type | Enum | New Graduate/Experienced/Any |
| Deadline | Date | Application deadline date |
| Current Stage | Enum | Interest/Applied/Document Pass/Coding Test/Interview/Final Acceptance |

#### Optional Fields (Optional)
| Field | Type | Description |
|-------|------|-------------|
| Job URL | String | Original posting link (Wanted/Saramin, etc.) |
| Source | Enum | Saramin/JobKorea/Company Website/LinkedIn/Other |
| Merit Tags | Array | High Salary/Flexible Work/Remote/Free Lunch/Stock Options, etc. (max 3) |
| Company Memo | Text | Free-form notes for company research, preparation items |
| Cover Letter | Text | Full text of written cover letter |

#### Merit Tag Rationale
**Reasons for Inclusion:**
1. **Priority Judgment**: Criteria for deciding which companies to focus on when viewing multiple postings simultaneously
2. **Data for Future**: Foundation for future filtering (e.g., "Show only companies with flexible work")
3. **2-3 Day Development**: UI/DB complexity managed through preset tag limitation (max 3)

**Constraints:**
- Preset list provided (no free input) → Data consistency assurance
- Max 3 selections → Prevent excessive information input

### 4.3 Stage Definitions

| Stage | Code | Description |
|-------|------|-------------|
| Interest | INTEREST | Posting discovered, preparing |
| Applied | APPLIED | Actual application completed |
| Document Pass | DOCUMENT_PASS | Document screening passed |
| Coding Test/Assignment | ASSIGNMENT | Coding test or assignment stage |
| Nth Interview | INTERVIEW | Interview in progress (round field indicates stage number) |
| Final Acceptance | FINAL_PASS | Final acceptance |
| Rejected | REJECTED | Rejected (no stage movement but recorded) |

**Interview Round Handling:**
- Stage unified as "Interview"
- Separate `interview_round` field stores round number (1, 2, 3...)
- Scalability: Covers up to 4th, 5th interviews while maintaining simple DB structure

### 4.4 Event (Schedule) Management

Events represent "application-related schedules occurring on specific dates".

#### Event Types
| Type | Description | Alert Target |
|------|-------------|--------------|
| Deadline | Application deadline | D-3, D-1 |
| Announcement | Expected announcement date for document/test/interview results | D-3, D-1 |
| Interview | Actual interview schedule | D-3, D-1 |

#### Event Data
| Field | Type | Description |
|-------|------|-------------|
| Event Type | Enum | Deadline/Announcement/Interview |
| Schedule Date | DateTime | Event occurrence date/time |
| Location/Link | String | Interview location or video conference link |
| Interview Round | Integer | Round number if interview (1st, 2nd...) |
| Alert Status | Object | D-3 alert sent, D-1 alert sent |

**Null Allowed:** Announcement dates are often undecided, so null is permitted

### 4.5 Notification System

#### Notification Channel: Email Rationale
| Channel | Pros | Cons | MVP Decision |
|---------|------|------|--------------|
| **Email (Selected)** | Simple implementation, many free solutions, users check daily | Possible delivery delays | **Selected** - Free tier (Resend) available |
| App Push | Instant | No mobile app (web push browser-dependent) | Excluded |
| SMS/Kakao | High reach | Costs incurred, complex implementation | v1.1 consideration |

#### Alert Timing
- **D-3**: "Deadline/Announcement/Interview in 3 days"
- **D-1**: "Deadline/Announcement/Interview tomorrow"

#### Notification Dispatch Mechanism
- Scheduler: Runs hourly (serverless function or cron job)
- Target: Unsent alerts + D-3/D-1 applicable events
- Duplicate prevention: Update `notified_d3`/`notified_d1` flags after sending

### 4.6 Dashboard Structure

#### Left: Summary Cards
| Card | Content |
|------|---------|
| Total Applications | Total count of all applications |
| Document Pass Count | Count with stage 'Document Pass' or higher |
| Interview In Progress | Count with stage 'Interview' |

#### Right: Upcoming Schedules Panel
| Section | Display Content | Sort |
|---------|-----------------|------|
| Approaching Deadlines | Deadlines within D-7 | Deadline ascending |
| Expected Announcements | Announcements within D-7 | Announcement date ascending |
| Scheduled Interviews | Interviews within D-7 | Interview date ascending |

**Nearest Date Priority:** Display 5 nearest schedules from today

### 4.7 File Management

#### Application Files
- **Type**: PDF only (resumes, portfolios, submitted documents)
- **Size**: Max 10MB per file
- **Storage**: Supabase Storage (free tier: 1GB)
- **DB Storage**: File URL and metadata (filename, size, upload date)

---

## 5. Technology Stack & Deployment

### 5.1 Recommended Stack (Free Tier Focus)

| Area | Selection | Rationale |
|------|-----------|-----------|
| **Frontend** | Next.js 14 (App Router) | SSR/SSG support, Vercel deployment optimized, abundant React learning resources |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid development, easy maintenance, design consistency |
| **UI Components** | shadcn/ui | Headless UI-based, excellent accessibility, Tailwind integration, easy customization |
| **Package Manager** | pnpm | Faster install speed, disk space efficiency, deterministic lockfile for team consistency |
| **Backend** | Next.js API Routes | Full-stack framework for integrated development, no separate server needed |
| **Database** | Supabase (PostgreSQL) | Free tier (500MB), real-time features, integrated auth/storage |
| **File Storage** | Supabase Storage | DB integration, 1GB free, easy access control |
| **Email** | Resend | 100 emails/day free, developer-friendly, easy Supabase integration |
| **Deployment** | Vercel | Free tier, Next.js native, CI/CD automation, custom domain support |
| **Scheduler** | Vercel Cron Jobs or GitHub Actions | Notification batch processing |

### 5.2 shadcn/ui Details

#### Selection Rationale
| Comparison | shadcn/ui | Chakra UI | Material UI |
|------------|-----------|-----------|-------------|
| **Next.js 14 Compatibility** | ✅ Perfect support | ⚠️ App Router in progress | ⚠️ Complex setup |
| **Tailwind Integration** | ✅ Native | ❌ Own CSS-in-JS | ❌ Own styling |
| **Bundle Size** | ✅ Only needed components (copy method) | ❌ Full library | ❌ Full library |
| **Customization** | ✅ Direct code modification | ⚠️ Theme overrides | ⚠️ Theme overrides |
| **Accessibility** | ✅ Radix UI-based | ✅ Compliant | ✅ Compliant |

**Core Advantage:** shadcn/ui is not a "library" but a "component collection". Using `pnpm dlx shadcn@latest add button` copies code into your project, providing complete customization freedom and zero runtime overhead.

#### Installation & Setup
```bash
# 1. Initialize Next.js project, then initialize shadcn/ui
pnpm dlx shadcn@latest init

# Configuration choices:
# - style: default (recommended)
# - base-color: slate (neutral colors suitable for productivity tools)
# - css variables: yes (dark mode preparation)

# 2. Install components needed for MVP
pnpm dlx shadcn@latest add button card badge dialog input label select textarea tabs separator avatar dropdown-menu toast
```

#### Component Usage List
| Feature Area | Components | Purpose |
|--------------|------------|---------|
| **Auth** | `button`, `input`, `label`, `card` | Login/Register forms |
| **Dashboard** | `card`, `badge`, `tabs`, `separator`, `avatar` | Stats cards, schedule lists |
| **Kanban Board** | `card`, `badge`, `button`, `dialog` | Application cards, stage movement |
| **Application Management** | `input`, `textarea`, `select`, `label`, `button`, `dialog` | Registration/Edit forms |
| **File Upload** | `button`, `card` | PDF upload UI |
| **Alerts** | `toast` (sonner), `badge` | Success/error messages |

#### Design Guidelines
```css
/* Aesthetic Direction: Industrial/Utilitarian */
/* Clean and functional design suitable for productivity tools */

/* Colors */
- Primary: slate-600 (neutral, professional)
- Accent: blue-600 (information, action)
- Success: emerald-600 (acceptance, completion)
- Warning: amber-600 (approaching, caution)
- Danger: red-600 (rejection, error)

/* Typography */
- Sans-serif system font (Geist or Inter)
- Size hierarchy: Clear heading/body/secondary text distinction

/* Spacing */
- Consistent 4px/8px grid system
- Information density: Medium-high (productivity tool characteristic)

/* Interactions */
- Clear hover states
- Smooth transitions (transition-all duration-200)
- Explicit loading state display
```

### 5.3 Alternative Comparison

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| **EC2 + RDS (Alternative)** | AWS learning, complete control | Complex setup, free tier limits (12 months), operational burden | Over-investment for MVP |
| **Firebase** | Real-time, full-stack integration | NoSQL (complex queries difficult), vendor lock-in | PostgreSQL preferred for data structure |
| **PlanetScale** | MySQL, serverless | Free tier limits, fewer features than Supabase | PostgreSQL better for JSON/Array handling |

### 5.4 Deployment Architecture

```
[User]
   ↓
[Vercel Edge Network]
   ↓
[Next.js App]
   ├── Frontend (React + shadcn/ui) → User Browser
   └── API Routes → Business Logic
       ↓
[Supabase]
   ├── PostgreSQL → Data Storage
   └── Storage → PDF Files
       ↓
[Resend] → Email Dispatch

[Scheduler] (Vercel Cron)
   └── Hourly alert check → Resend
```

---

## 6. Database Schema

### 6.1 Table Structure

#### users
```sql
- id: UUID (PK)
- email: VARCHAR (Unique)
- password_hash: VARCHAR (bcrypt)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### applications
```sql
- id: UUID (PK)
- user_id: UUID (FK → users)
- company_name: VARCHAR (Required)
- position: VARCHAR (Required)
- career_type: ENUM ('new', 'experienced', 'any') (Required)
- job_url: VARCHAR
- source: ENUM ('saramin', 'jobkorea', 'company', 'linkedin', 'etc')
- merit_tags: JSON (['high_salary', 'flexible', 'remote', ...])
- current_stage: ENUM ('interest', 'applied', 'document_pass', 'assignment', 'interview', 'final_pass', 'rejected') (Required)
- company_memo: TEXT
- cover_letter: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### events
```sql
- id: UUID (PK)
- application_id: UUID (FK → applications)
- event_type: ENUM ('deadline', 'result', 'interview') (Required)
- scheduled_at: TIMESTAMP (Required)
- location: VARCHAR
- interview_round: INTEGER (if interview)
- notified_d3: BOOLEAN (default: false)
- notified_d1: BOOLEAN (default: false)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### documents
```sql
- id: UUID (PK)
- application_id: UUID (FK → applications)
- file_name: VARCHAR
- file_url: VARCHAR
- file_size: INTEGER
- created_at: TIMESTAMP
```

### 6.2 Key Indexes
- `applications(user_id, current_stage)` - For kanban queries
- `events(scheduled_at, notified_d3, notified_d1)` - For alert scanning
- `events(application_id, event_type)` - For application-specific schedule queries

---

## 7. Development Timeline (2-3 Days)

### Day 1: Core Structure & CRUD
| Time | Task | Deliverable |
|------|------|-------------|
| 0-2h | Project setup (Next.js + shadcn/ui + Supabase integration) | Development environment |
| 2-4h | Authentication (Login/Register/Logout) | JWT auth complete |
| 4-6h | DB schema creation & basic APIs | Tables created, basic CRUD APIs |
| 6-8h | Application registration/view/edit/delete | Application management features |

### Day 2: Visualization & Files
| Time | Task | Deliverable |
|------|------|-------------|
| 0-3h | Kanban board implementation | Stage-movable board |
| 3-5h | Dashboard + This Week's Schedule panel | Main screen complete |
| 5-7h | PDF upload/download | File management features |
| 7-8h | Event (schedule) registration/management | Deadline/announcement/interview input |

### Day 3: Notifications & Deployment
| Time | Task | Deliverable |
|------|------|-------------|
| 0-3h | Email notification system (Resend integration) | D-3/D-1 alerts dispatch |
| 3-4h | Scheduler setup (Cron job) | Hourly alert checks |
| 4-6h | Vercel deployment & domain connection | Production environment |
| 6-8h | Real data testing (20-30 entries) | Bug fixes & stabilization |

### Buffer
- Day 3 after 8h: Unexpected bug fixes and completion criteria verification

---

## 8. Definition of Done

### 8.1 Functional Completion Criteria
- [ ] Login/Register/Logout working normally
- [ ] Application CRUD (Create/Read/Update/Delete) without errors
- [ ] Stage movement on Kanban board working normally
- [ ] Events (deadlines/announcements/interviews) registration and viewing possible
- [ ] Dashboard accurately displays statistics and upcoming schedules
- [ ] PDF file upload/download possible

### 8.2 Quality Criteria
- [ ] **Zero API error reports for 7 days post-deployment**
- [ ] All API response times under 2 seconds (excluding network conditions)
- [ ] Basic usability on mobile browsers (responsive)
- [ ] Password encrypted storage (bcrypt)

### 8.3 Learning Goals Achievement
- [ ] Full-stack web app development experience (Frontend + Backend + DB)
- [ ] Cloud deployment & operations experience (Vercel + Supabase)
- [ ] Email alert/scheduler implementation experience
- [ ] Real user (yourself) feedback-based improvement experience

---

## 9. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| MVP features incomplete in 3 days | Medium | Medium | Priority adjustment (PDF upload → v1.1 possible) |
| Email spam filtering | Medium | Medium | Resend domain verification, clear sender address |
| Supabase free tier limit exceeded | Low | Medium | Monitoring, migrate to paid plan if needed |
| Complex query performance issues | Low | Low | Proper index setup, materialized view if needed |

---

## 10. Future Expansion Plan (v1.1+)

### Short-term (Within 1-2 weeks)
- Template feature: Save and load cover letter question templates
- Responsive improvements: Mobile usability optimization
- Enhanced statistics: Monthly application trends, acceptance rate analysis

### Mid-term (Within 1 month)
- Social login: Google account integration
- External calendar integration: Google Calendar integration
- Search/Filter: Company name, position, merit tag filtering

### Long-term (Within 3 months)
- Multi-user: Share progress with family/friends
- Public API: Integration with other services
- Mobile app: React Native or PWA

---

## 11. References & Learning Materials

### Official Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/docs)
- [Resend Documentation](https://resend.com/docs)

### Learning Points
1. **Full-stack Integration**: Next.js App Router and Supabase integration patterns
2. **UI Components**: shadcn/ui component customization and extension
3. **Serverless Deployment**: API Routes and Cron Jobs on Vercel
4. **Email System**: Transactional email dispatch and scheduling
5. **File Management**: Cloud storage integration and access control
6. **Auth Security**: JWT token management and password hashing

---

**Document Version**: v1.0 (MVP)
**Created**: 2026-02-13
**Next Review**: 7 days post-MVP deployment
