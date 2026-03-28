# MVP Implementation Plan

## Goal
Deliver the core advisor loop: **Intake → Transcript → Summary → Profile → CRM**, with human review at each critical step.

---

## MVP Scope

### In Scope
1. **Case management** — create/list/view cases
2. **File upload** — audio + documents to S3/MinIO
3. **Transcription** — audio → text via Whisper API
4. **Meeting summary** — transcript → structured summary via LLM
5. **Client profile** — create/update 360° profile from summary
6. **CRM entry** — generate actionable CRM record
7. **Human review UI** — approve/edit/reject each step
8. **Completeness check** — show missing data fields
9. **Version history** — track all outputs with versions
10. **Basic PII detection** — regex-based for Czech PII patterns

### Out of Scope (post-MVP)
- Specialized financial modules (life insurance, investments, etc.)
- Client output generation (podcasts, videos, etc.)
- CRM API integration (Pipedrive)
- Advanced NER-based PII detection
- Multi-advisor / team features
- NotebookLM integration
- Product knowledge base

---

## Tech Stack (MVP)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 14+ (App Router) | React Server Components, Tailwind CSS |
| Backend | Next.js API Routes + BullMQ | Monolith for speed, queue for async jobs |
| Database | PostgreSQL + Prisma | Migrations, type-safe queries |
| File Storage | MinIO (dev) / S3 (prod) | Audio, documents |
| Cache/Queue | Redis | BullMQ job queue + caching |
| LLM | Anthropic Claude API | Via abstraction layer |
| Transcription | OpenAI Whisper API | Via abstraction layer |
| Auth | NextAuth.js | Simple email/password for MVP |
| Deployment | Docker Compose (dev) | Simple local setup |

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**1.1 Project setup**
- Initialize monorepo (turborepo)
- Configure TypeScript, ESLint, Prettier
- Set up Prisma schema
- Docker Compose for PostgreSQL + Redis + MinIO
- Basic Next.js app shell

**1.2 Data layer**
- Prisma models for: Client, MeetingCase, Transcript, MeetingSummary, ClientProfile, CRMEntry, AuditLog
- CRUD services for each entity
- File upload service (MinIO)
- Audit logging middleware

**1.3 LLM abstraction**
- Provider-agnostic wrapper (`packages/core/src/utils/llm-provider.ts`)
- Prompt versioning system
- Token counting and cost tracking
- Structured output parsing (JSON mode)

### Phase 2: Core Pipeline (Week 3-5)

**2.1 Intake module**
- API: POST /api/cases — create case with files
- File upload to MinIO with metadata
- Auto-detect audio files
- UI: "New Case" form

**2.2 Transcription module**
- BullMQ job: process audio file
- Whisper API integration
- Speaker diarization (if available)
- Quality scoring
- UI: transcript viewer with edit capability

**2.3 Meeting Summary module**
- BullMQ job: process transcript
- Prompt: structured extraction (see prompts/)
- JSON schema validation of output
- Confidence scoring
- UI: summary viewer with inline editing

**2.4 Client Profile module**
- BullMQ job: merge summary into profile
- Diff generation (old vs new)
- Completeness scoring
- Missing fields identification
- UI: profile viewer with change highlights

**2.5 CRM Entry module**
- BullMQ job: generate CRM record
- Concise, actionable format
- UI: CRM entry editor
- Copy-to-clipboard for manual CRM paste

### Phase 3: Review & Polish (Week 6-8)

**3.1 Human review flow**
- Review status management (pending → approved/rejected)
- Inline editing for each output
- "Regenerate" button (re-run AI with same inputs)
- Workflow blocking (downstream steps wait for approval)

**3.2 Dashboard**
- Case list with workflow progress indicators
- Client list with last activity
- Quick stats (cases this week, pending reviews)

**3.3 History & audit**
- Version history for each output
- Audit log viewer
- Diff view between versions

**3.4 Basic PII**
- Regex patterns for Czech PII (rodné číslo, phone, email, etc.)
- Flag detected PII in uploads
- Warning UI when PII detected

**3.5 Testing & hardening**
- Unit tests for core services
- Integration tests for pipeline
- Mock data for demo
- Error handling polish

---

## Database Schema (Prisma, simplified)

```prisma
model Client {
  id        String   @id @default(uuid())
  name      String
  profile   Json     // ClientProfile type
  version   Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  cases     MeetingCase[]
  history   ProfileHistory[]
}

model MeetingCase {
  id             String   @id @default(uuid())
  clientId       String
  advisorId      String
  meetingDate    DateTime
  meetingType    String?
  notes          String?
  workflowState  Json     // WorkflowState type
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  client         Client   @relation(fields: [clientId], references: [id])
  files          SourceFile[]
  transcript     Transcript?
  summary        MeetingSummary?
  crmEntry       CRMEntry?
}

model SourceFile {
  id          String   @id @default(uuid())
  caseId      String
  filename    String
  mimeType    String
  sizeBytes   Int
  storagePath String
  purpose     String
  createdAt   DateTime @default(now())
  case        MeetingCase @relation(fields: [caseId], references: [id])
}

model Transcript {
  id            String   @id @default(uuid())
  caseId        String   @unique
  rawSegments   Json
  cleanedText   String
  quality       Json
  provider      String
  reviewStatus  String   @default("pending")
  version       Int      @default(1)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  case          MeetingCase @relation(fields: [caseId], references: [id])
}

model MeetingSummary {
  id            String   @id @default(uuid())
  caseId        String   @unique
  content       Json     // Full MeetingSummary type
  confidence    Float
  reviewStatus  String   @default("pending")
  reviewerNotes String?
  version       Int      @default(1)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  case          MeetingCase @relation(fields: [caseId], references: [id])
}

model CRMEntry {
  id            String   @id @default(uuid())
  caseId        String   @unique
  content       Json     // CRMEntry type
  reviewStatus  String   @default("pending")
  exported      Boolean  @default(false)
  version       Int      @default(1)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  case          MeetingCase @relation(fields: [caseId], references: [id])
}

model ProfileHistory {
  id         String   @id @default(uuid())
  clientId   String
  caseId     String
  changes    Json     // Diff of changes
  version    Int
  createdAt  DateTime @default(now())
  client     Client   @relation(fields: [clientId], references: [id])
}

model AuditLog {
  id          String   @id @default(uuid())
  userId      String
  action      String
  entityType  String
  entityId    String
  description String
  metadata    Json?
  createdAt   DateTime @default(now())
}
```

---

## API Endpoints (MVP)

### Cases
- `POST /api/cases` — Create new case (with file uploads)
- `GET /api/cases` — List cases (with filters)
- `GET /api/cases/:id` — Get case detail with workflow state
- `DELETE /api/cases/:id` — Soft delete case

### Workflow
- `POST /api/cases/:id/transcribe` — Trigger transcription
- `POST /api/cases/:id/summarize` — Trigger summary generation
- `POST /api/cases/:id/update-profile` — Trigger profile update
- `POST /api/cases/:id/generate-crm` — Trigger CRM entry generation

### Review
- `POST /api/cases/:id/review/:step` — Approve/reject/edit step output
  - Body: `{ action: "approve" | "reject" | "edit_and_approve", edits?: object, notes?: string }`

### Clients
- `GET /api/clients` — List clients
- `GET /api/clients/:id` — Get client with profile
- `GET /api/clients/:id/history` — Profile change history

### Jobs
- `GET /api/jobs/:id` — Check job status

---

## Key Files to Create

```
apps/web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Dashboard
│   ├── cases/
│   │   ├── page.tsx               # Case list
│   │   ├── new/page.tsx           # New case form
│   │   └── [id]/
│   │       ├── page.tsx           # Case detail + workflow
│   │       ├── transcript/page.tsx
│   │       ├── summary/page.tsx
│   │       ├── profile/page.tsx
│   │       └── crm/page.tsx
│   ├── clients/
│   │   ├── page.tsx               # Client list
│   │   └── [id]/page.tsx          # Client detail
│   └── api/
│       ├── cases/route.ts
│       ├── clients/route.ts
│       └── jobs/route.ts
├── components/
│   ├── WorkflowProgress.tsx
│   ├── ReviewPanel.tsx
│   ├── TranscriptViewer.tsx
│   ├── SummaryEditor.tsx
│   ├── ProfileViewer.tsx
│   ├── CRMEntryEditor.tsx
│   ├── FileUpload.tsx
│   └── MissingDataBadge.tsx
└── lib/
    ├── prisma.ts
    ├── minio.ts
    ├── queue.ts
    └── api-client.ts

packages/core/src/
├── services/
│   ├── case-service.ts
│   ├── transcript-service.ts
│   ├── summary-service.ts
│   ├── profile-service.ts
│   ├── crm-service.ts
│   └── audit-service.ts
├── utils/
│   ├── llm-provider.ts
│   ├── transcription-provider.ts
│   └── completeness-scorer.ts
└── validators/
    ├── summary-validator.ts
    └── profile-validator.ts
```

---

## Success Criteria for MVP

1. Advisor can create a case and upload audio
2. System produces transcript from audio within 5 minutes
3. System produces structured summary within 2 minutes
4. Advisor can review and edit summary
5. System updates client profile from approved summary
6. System generates CRM entry
7. All outputs show confidence indicators
8. Missing data clearly highlighted
9. Complete audit trail of all actions
10. Works reliably with 30-90 minute Czech-language meetings
