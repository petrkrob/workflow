# AI Financial Advisor Workflow Platform — Technical Blueprint

## 1. Problem Summary

Financial advisors currently run a fragmented, manual workflow: record client meetings, manually transcribe and summarize, copy data between tools (ChatGPT, NotebookLM, CRM), and produce client-facing materials by hand. This leads to lost context, inconsistent quality, duplicated effort, and risk of hallucinated or unauditable outputs.

**This platform turns that into a modular, auditable pipeline:**
Audio/documents in → structured data out → human review → specialized analysis → client deliverables.

---

## 2. Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Web App)                      │
│  Dashboard │ Case Detail │ Client Profile │ Review/Approve   │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST/GraphQL
┌──────────────────────────▼──────────────────────────────────┐
│                      API LAYER (Node.js)                     │
│  Auth │ Case Mgmt │ File Upload │ Workflow Orchestration     │
└──────┬───────────────────┬──────────────────┬───────────────┘
       │                   │                  │
┌──────▼─────┐  ┌─────────▼────────┐  ┌─────▼──────────────┐
│  Job Queue │  │   AI Pipeline    │  │  Security Layer    │
│  (BullMQ)  │  │  (Module Chain)  │  │  PII Detection     │
│            │  │                  │  │  Redaction          │
└──────┬─────┘  └─────────┬────────┘  │  Audit Log         │
       │                  │           └────────────────────┘
       │    ┌─────────────▼────────────────┐
       │    │      AI MODULES              │
       │    │  ┌──────────────────────┐    │
       │    │  │ 1. Transcription     │    │
       │    │  │ 2. Meeting Summary   │    │
       │    │  │ 3. Client Profile    │    │
       │    │  │ 4. CRM Entry         │    │
       │    │  │ 5a. Life Insurance    │    │
       │    │  │ 5b. Investments      │    │
       │    │  │ 5c. Mortgage         │    │
       │    │  │ 5d. Property Ins.    │    │
       │    │  │ 6. Client Outputs    │    │
       │    │  └──────────────────────┘    │
       │    └──────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────┐
│                    DATA LAYER                                │
│  PostgreSQL (structured) │ S3/MinIO (files) │ Redis (cache) │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend runtime | Node.js + TypeScript | Type safety, ecosystem, shared types with frontend |
| Queue system | BullMQ (Redis-backed) | Reliable async jobs for long-running AI calls |
| Database | PostgreSQL + Prisma | Structured data, migrations, audit trail |
| File storage | S3-compatible (MinIO for dev) | Audio, documents, parsed outputs |
| LLM abstraction | Provider-agnostic wrapper | Swap OpenAI/Anthropic/local without code changes |
| Frontend | Next.js | SSR, API routes, fast dev |
| Auth | NextAuth.js or Clerk | Simple, extensible |
| Observability | Structured logging + OpenTelemetry | Trace every AI call and decision |

---

## 3. Core Modules

### Module 1: Intake
- **Purpose:** Accept audio, documents, notes; create a Case
- **Input:** Files + metadata (client_id, advisor_id, date)
- **Output:** `MeetingCase` entity with assigned `case_id`, files stored
- **Human review:** None (automatic)

### Module 2: Transcription
- **Purpose:** Audio → text with speaker diarization
- **Input:** Audio file reference
- **Output:** `Transcript` (raw + cleaned versions, quality metadata)
- **Provider:** Whisper API / Deepgram / AssemblyAI (abstracted)
- **Human review:** Optional correction

### Module 3: Meeting Summary
- **Purpose:** Transcript → structured summary
- **Input:** `Transcript` + advisor notes
- **Output:** `MeetingSummary` with topics, facts, goals, tasks, gaps
- **Human review:** **Required** — advisor confirms before downstream use

### Module 4: Client Profile (360°)
- **Purpose:** Build/update cumulative client profile
- **Input:** `MeetingSummary` + existing `ClientProfile` (if any)
- **Output:** Updated `ClientProfile` with change diff
- **Human review:** **Required** — advisor confirms changes

### Module 5: CRM Entry
- **Purpose:** Generate actionable CRM record
- **Input:** `MeetingSummary` + `ClientProfile`
- **Output:** `CRMEntry` ready for Pipedrive export
- **Human review:** **Required** — advisor edits before export

### Module 6: Specialized Financial Modules
Each is an independent expert agent:
- **6a. Life Insurance** — gap analysis, coverage review, old vs new comparison
- **6b. Investments & Retirement** — portfolio analysis, strategy, product fit
- **6c. Mortgage & Loans** — refinancing, cashflow impact, affordability
- **6d. Property Insurance** — coverage gaps, liability review

**Input:** `ClientProfile` + `MeetingSummary` + relevant `SourceDocuments`
**Output:** Specialized `PlanningReport` per domain
**Human review:** **Required**

### Module 7: Client Output Generation
- **Purpose:** Create client-facing materials
- **Input:** Approved internal outputs + product knowledge base
- **Output:** Podcast scripts, video scripts, HTML summaries, email content
- **Human review:** **Required** before delivery

---

## 4. Data Flow

```
Audio/Docs ──► Intake ──► Transcription ──► Meeting Summary ──┐
                                                               │
                                              ┌────────────────▼───────────────┐
                                              │        Human Review            │
                                              │   (Approve/Edit Summary)       │
                                              └────────────────┬───────────────┘
                                                               │
                                    ┌──────────────────────────▼──────────┐
                                    │                                     │
                              ┌─────▼──────┐                    ┌────────▼───────┐
                              │  Client    │                    │   CRM Entry    │
                              │  Profile   │                    │                │
                              │  Update    │                    └────────┬───────┘
                              └─────┬──────┘                             │
                                    │ (after human review)       (after human review)
                                    │                                    │
                         ┌──────────▼──────────────┐            ┌───────▼────────┐
                         │  Specialized Modules    │            │  CRM Export    │
                         │  (Insurance, Invest,    │            │  (Pipedrive)   │
                         │   Mortgage, Property)   │            └────────────────┘
                         └──────────┬──────────────┘
                                    │ (after human review)
                         ┌──────────▼──────────────┐
                         │  Client Outputs         │
                         │  (Podcast, Video, HTML)  │
                         └─────────────────────────┘
```

---

## 5. Data Entities

Core entities (full TypeScript definitions in `packages/core/src/entities/`):

| Entity | Purpose |
|--------|---------|
| `Client` | Long-lived client record |
| `MeetingCase` | Single meeting/session container |
| `Transcript` | Raw + cleaned transcript |
| `MeetingSummary` | Structured meeting extraction |
| `ClientProfile` | Cumulative 360° client view |
| `CRMEntry` | Actionable CRM record |
| `SourceDocument` | Uploaded document (contract, model) |
| `RedactedDocument` | PII-stripped version |
| `PlanningReport` | Output from specialized module |
| `ClientOutput` | Client-facing deliverable |
| `AdvisorTask` / `ClientTask` | Action items |
| `AuditLogEntry` | Every action tracked |
| `WorkflowStep` | Pipeline step status |

---

## 6. Orchestration Design

Each `MeetingCase` has a `WorkflowState` that tracks which steps are complete:

```typescript
type StepStatus = 'pending' | 'processing' | 'awaiting_review' | 'approved' | 'failed' | 'skipped';

interface WorkflowState {
  intake: StepStatus;
  transcription: StepStatus;
  summary: StepStatus;
  profile_update: StepStatus;
  crm_entry: StepStatus;
  planning_modules: Record<PlanningDomain, StepStatus>;
  client_outputs: StepStatus;
}
```

**Orchestration rules:**
1. Steps execute sequentially by default (each depends on prior output)
2. Steps requiring human review block downstream steps until approved
3. Specialized modules (6a-6d) can run in parallel after profile is approved
4. Client outputs run after specialized modules are approved
5. Any step can be re-run (idempotent) if inputs change
6. Failed steps don't block unrelated branches

**Implementation:** BullMQ flows with parent-child job dependencies.

---

## 7. Risk Points

| Risk | Mitigation |
|------|------------|
| LLM hallucination | Strict extraction-only prompts, confidence scores, source citations |
| Poor audio quality | Quality score on transcript, flag low-confidence segments |
| Incomplete client data | Completeness scoring, "missing info" checklist |
| PII leakage | Redaction pipeline, separated storage, role-based access |
| Prompt drift | Versioned prompts, regression tests with golden datasets |
| Single LLM dependency | Provider abstraction layer |
| Data loss | Immutable audit log, versioned outputs, backup strategy |

---

## 8. Security Layer

### PII Detection & Redaction Pipeline

```
Input Document ──► PII Scanner ──► Detected Entities ──► Redaction Engine ──► Redacted Version
                                         │
                                    ┌────▼────┐
                                    │ PII Map │ (stored separately, encrypted)
                                    └─────────┘
```

**Detected PII types:** Birth number (rodné číslo), contract numbers, bank accounts, addresses, phone numbers, emails, dates of birth, employer info, health data, income figures, child/family data.

**Principles:**
- Full data stored encrypted, access-controlled
- Redacted versions used for client-facing outputs
- AI modules get minimum necessary data (data minimization)
- Audit log tracks who accessed what
- Internal tokens replace real identifiers where possible

---

## 9. MVP Scope

### MVP delivers the core loop:

1. **Intake** — upload audio + docs, create case
2. **Transcription** — audio → transcript (Whisper/Deepgram)
3. **Meeting Summary** — transcript → structured summary (LLM)
4. **Client Profile** — summary → profile create/update (LLM)
5. **CRM Entry** — summary + profile → CRM record (LLM)
6. **Human Review UI** — approve/edit each step before proceeding
7. **Completeness Check** — show what data is missing
8. **History** — version all outputs, show diffs

### MVP does NOT include:
- Specialized financial modules (post-MVP)
- Client output generation (post-MVP)
- CRM API integration (manual copy for MVP)
- Advanced PII redaction (basic regex-based for MVP)
- Multi-advisor support (single advisor for MVP)

### MVP Tech Stack:
- Next.js (frontend + API routes)
- PostgreSQL + Prisma
- BullMQ + Redis
- S3/MinIO for files
- Anthropic Claude API (primary LLM)
- Whisper API (transcription)

---

## 10. Roadmap

| Phase | Scope | Timeline Target |
|-------|-------|----------------|
| **MVP** | Intake → Transcript → Summary → Profile → CRM + Review UI | 6-8 weeks |
| **v1.1** | Life Insurance module, basic PII redaction | +3-4 weeks |
| **v1.2** | Investment + Retirement module, profile diff/history | +3-4 weeks |
| **v1.3** | Mortgage + Property Insurance modules | +3-4 weeks |
| **v2.0** | Client output generation (podcast, video scripts, HTML) | +4-6 weeks |
| **v2.1** | CRM API integration (Pipedrive), email export | +2-3 weeks |
| **v2.2** | Advanced PII (NER-based), role-based access, multi-advisor | +4-6 weeks |
| **v3.0** | NotebookLM integration, advanced analytics, client portal | Future |

---

## 11. UX Flow for Advisor

```
1. Login → Dashboard (list of cases)
2. "+ New Case" → Select/create client, upload audio/docs
3. Case Detail → See workflow progress bar
4. Each step shows:
   - Generated output (editable)
   - Confidence indicators
   - Missing data warnings
   - "Approve" / "Edit & Approve" / "Regenerate" buttons
5. After approval → next step auto-triggers
6. Client Profile page → cumulative view, change history
7. Outputs tab → generated materials (internal vs client-facing)
```
