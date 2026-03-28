/**
 * Workflow Contracts — precise definition of input, output, validations,
 * failure modes, and human review checkpoints for each pipeline step.
 */

// ============================================================
// GENERIC WORKFLOW STEP CONTRACT
// ============================================================

export interface WorkflowStepContract<TInput, TOutput> {
  step_name: string;
  description: string;
  input: TInput;
  output: TOutput;
  validations: ValidationRule[];
  failure_modes: FailureMode[];
  human_review: HumanReviewCheckpoint | null;
  retry_policy: RetryPolicy;
  timeout_ms: number;
}

export interface ValidationRule {
  name: string;
  description: string;
  severity: 'error' | 'warning';
  check: string; // Description of what to validate
}

export interface FailureMode {
  name: string;
  description: string;
  probability: 'high' | 'medium' | 'low';
  impact: 'blocking' | 'degraded' | 'minor';
  recovery: string;
}

export interface HumanReviewCheckpoint {
  required: boolean;
  review_type: 'approve' | 'edit_and_approve' | 'select_option';
  description: string;
  timeout_hours?: number; // Max time to wait for review
  auto_approve_if?: string; // Condition for auto-approval
}

export interface RetryPolicy {
  max_retries: number;
  backoff_type: 'fixed' | 'exponential';
  initial_delay_ms: number;
  retryable_errors: string[];
}

// ============================================================
// STEP 1: INTAKE
// ============================================================

export interface IntakeInput {
  client_id: string;
  advisor_id: string;
  meeting_date: string;
  meeting_type?: string;
  files: Array<{
    filename: string;
    mime_type: string;
    size_bytes: number;
    purpose: string;
    data: Buffer | ReadableStream;
  }>;
  notes?: string;
}

export interface IntakeOutput {
  case_id: string;
  stored_files: Array<{
    file_id: string;
    filename: string;
    storage_path: string;
  }>;
  audio_file_detected: boolean;
  document_count: number;
}

export const INTAKE_CONTRACT: WorkflowStepContract<IntakeInput, IntakeOutput> = {
  step_name: 'intake',
  description: 'Accept files and metadata, create a MeetingCase, store files, and trigger downstream steps.',
  input: {} as IntakeInput,
  output: {} as IntakeOutput,
  validations: [
    {
      name: 'client_exists',
      description: 'Verify client_id references an existing client or create new',
      severity: 'error',
    },
    {
      name: 'file_type_allowed',
      description: 'Only accept allowed MIME types (audio/*, application/pdf, image/*, .docx, .xlsx)',
      severity: 'error',
    },
    {
      name: 'file_size_limit',
      description: 'Reject files over 500MB (audio) or 50MB (documents)',
      severity: 'error',
    },
    {
      name: 'meeting_date_valid',
      description: 'Meeting date must be valid and not in the future',
      severity: 'warning',
    },
  ],
  failure_modes: [
    {
      name: 'storage_unavailable',
      description: 'File storage (S3/MinIO) is unreachable',
      probability: 'low',
      impact: 'blocking',
      recovery: 'Retry with backoff; alert if persistent',
    },
    {
      name: 'corrupt_file',
      description: 'Uploaded file is corrupt or unreadable',
      probability: 'medium',
      impact: 'degraded',
      recovery: 'Mark file as failed, continue with other files, notify advisor',
    },
  ],
  human_review: null, // Automatic
  retry_policy: {
    max_retries: 3,
    backoff_type: 'exponential',
    initial_delay_ms: 1000,
    retryable_errors: ['storage_unavailable', 'network_error'],
  },
  timeout_ms: 60_000,
};

// ============================================================
// STEP 2: TRANSCRIPTION
// ============================================================

export interface TranscriptionInput {
  case_id: string;
  audio_file_id: string;
  audio_storage_path: string;
  language_hint?: string; // Default: "cs" (Czech)
}

export interface TranscriptionOutput {
  transcript_id: string;
  raw_segments: Array<{
    speaker?: string;
    start_time: number;
    end_time: number;
    text: string;
    confidence: number;
  }>;
  cleaned_text: string;
  quality_score: number;
  duration_seconds: number;
  speaker_count: number;
}

export const TRANSCRIPTION_CONTRACT: WorkflowStepContract<TranscriptionInput, TranscriptionOutput> = {
  step_name: 'transcription',
  description: 'Convert audio file to text with speaker diarization and quality metadata.',
  input: {} as TranscriptionInput,
  output: {} as TranscriptionOutput,
  validations: [
    {
      name: 'audio_file_exists',
      description: 'Audio file must exist in storage',
      severity: 'error',
    },
    {
      name: 'audio_format_supported',
      description: 'Audio must be in supported format (mp3, wav, m4a, ogg, webm)',
      severity: 'error',
    },
    {
      name: 'minimum_duration',
      description: 'Audio must be at least 10 seconds long',
      severity: 'warning',
    },
    {
      name: 'output_not_empty',
      description: 'Transcript must contain at least one segment',
      severity: 'error',
    },
  ],
  failure_modes: [
    {
      name: 'transcription_api_error',
      description: 'Transcription provider API fails or times out',
      probability: 'medium',
      impact: 'blocking',
      recovery: 'Retry with backoff; fallback to alternative provider',
    },
    {
      name: 'low_quality_audio',
      description: 'Audio quality too poor for reliable transcription',
      probability: 'medium',
      impact: 'degraded',
      recovery: 'Generate transcript with low confidence warning; flag for manual review',
    },
    {
      name: 'unsupported_language',
      description: 'Speech is in unsupported language or mixed languages',
      probability: 'low',
      impact: 'degraded',
      recovery: 'Attempt transcription, warn about potential quality issues',
    },
  ],
  human_review: {
    required: false, // Optional correction
    review_type: 'edit_and_approve',
    description: 'Advisor can optionally review and correct transcript errors.',
    auto_approve_if: 'quality_score > 0.85',
  },
  retry_policy: {
    max_retries: 2,
    backoff_type: 'exponential',
    initial_delay_ms: 5000,
    retryable_errors: ['transcription_api_error', 'network_error'],
  },
  timeout_ms: 600_000, // 10 min for long meetings
};

// ============================================================
// STEP 3: MEETING SUMMARY
// ============================================================

export interface MeetingSummaryInput {
  case_id: string;
  transcript_id: string;
  transcript_text: string;
  advisor_notes?: string;
  client_profile?: object; // Existing profile for context
}

export interface MeetingSummaryOutput {
  summary_id: string;
  discussed_topics: Array<{ topic: string; category: string; key_points: string[] }>;
  financial_facts: Array<{ fact: string; confidence: string; source: string }>;
  client_goals: Array<{ description: string; priority: string }>;
  client_concerns: string[];
  agreements: string[];
  advisor_tasks: Array<{ description: string; priority: string }>;
  client_tasks: Array<{ description: string; priority: string }>;
  missing_information: Array<{ description: string; importance: string }>;
  next_step: string;
  extraction_confidence: number;
}

export const MEETING_SUMMARY_CONTRACT: WorkflowStepContract<MeetingSummaryInput, MeetingSummaryOutput> = {
  step_name: 'meeting_summary',
  description: 'Extract structured meeting summary from transcript. Connects scattered info into coherent topics.',
  input: {} as MeetingSummaryInput,
  output: {} as MeetingSummaryOutput,
  validations: [
    {
      name: 'transcript_not_empty',
      description: 'Transcript must contain meaningful content (>50 words)',
      severity: 'error',
    },
    {
      name: 'topics_extracted',
      description: 'At least one discussed topic must be identified',
      severity: 'warning',
    },
    {
      name: 'no_hallucinated_facts',
      description: 'Every financial_fact must have source reference back to transcript',
      severity: 'error',
    },
    {
      name: 'confidence_threshold',
      description: 'Warn if extraction_confidence < 60',
      severity: 'warning',
    },
  ],
  failure_modes: [
    {
      name: 'llm_api_error',
      description: 'LLM provider API fails',
      probability: 'low',
      impact: 'blocking',
      recovery: 'Retry; fallback to alternative model',
    },
    {
      name: 'poor_transcript_quality',
      description: 'Transcript too noisy for reliable extraction',
      probability: 'medium',
      impact: 'degraded',
      recovery: 'Generate summary with heavy warnings; require human review',
    },
    {
      name: 'context_window_exceeded',
      description: 'Transcript too long for single LLM call',
      probability: 'medium',
      impact: 'degraded',
      recovery: 'Split transcript into chunks, summarize each, then merge',
    },
  ],
  human_review: {
    required: true,
    review_type: 'edit_and_approve',
    description: 'Advisor MUST review and approve the meeting summary before it feeds into profile and CRM.',
    timeout_hours: 72,
  },
  retry_policy: {
    max_retries: 2,
    backoff_type: 'exponential',
    initial_delay_ms: 2000,
    retryable_errors: ['llm_api_error', 'network_error'],
  },
  timeout_ms: 120_000,
};

// ============================================================
// STEP 4: CLIENT PROFILE UPDATE
// ============================================================

export interface ProfileUpdateInput {
  case_id: string;
  client_id: string;
  approved_summary_id: string;
  approved_summary: object;
  existing_profile?: object; // Current profile, if any
}

export interface ProfileUpdateOutput {
  profile_id: string;
  profile_version: number;
  changes_made: Array<{
    field_path: string;
    old_value?: string;
    new_value: string;
    change_type: 'new' | 'updated' | 'confirmed' | 'contradicted';
    confidence: string;
  }>;
  completeness_score: number;
  missing_fields: Array<{ field: string; importance: string }>;
}

export const PROFILE_UPDATE_CONTRACT: WorkflowStepContract<ProfileUpdateInput, ProfileUpdateOutput> = {
  step_name: 'profile_update',
  description: 'Create or update 360° client profile from approved meeting summary.',
  input: {} as ProfileUpdateInput,
  output: {} as ProfileUpdateOutput,
  validations: [
    {
      name: 'summary_approved',
      description: 'Meeting summary must be in approved state',
      severity: 'error',
    },
    {
      name: 'no_data_loss',
      description: 'Existing profile fields must not be removed without explicit reason',
      severity: 'error',
    },
    {
      name: 'change_diff_present',
      description: 'Changes must be explicitly listed with old/new values',
      severity: 'warning',
    },
    {
      name: 'contradiction_flagged',
      description: 'If new data contradicts existing profile, flag for human decision',
      severity: 'error',
    },
  ],
  failure_modes: [
    {
      name: 'merge_conflict',
      description: 'New data contradicts existing profile data',
      probability: 'medium',
      impact: 'blocking',
      recovery: 'Present both versions to advisor for resolution',
    },
    {
      name: 'llm_api_error',
      description: 'LLM provider API fails',
      probability: 'low',
      impact: 'blocking',
      recovery: 'Retry with backoff',
    },
  ],
  human_review: {
    required: true,
    review_type: 'edit_and_approve',
    description: 'Advisor MUST review profile changes, especially contradictions and new fields.',
    timeout_hours: 72,
  },
  retry_policy: {
    max_retries: 2,
    backoff_type: 'exponential',
    initial_delay_ms: 2000,
    retryable_errors: ['llm_api_error', 'network_error'],
  },
  timeout_ms: 120_000,
};

// ============================================================
// STEP 5: CRM ENTRY
// ============================================================

export interface CRMEntryInput {
  case_id: string;
  client_id: string;
  approved_summary: object;
  approved_profile: object;
}

export interface CRMEntryOutput {
  crm_entry_id: string;
  top_priorities: string[];
  agreed_actions: string[];
  advisor_tasks: Array<{ description: string; priority: string; deadline?: string }>;
  client_tasks: Array<{ description: string; priority: string; deadline?: string }>;
  next_contact: { type: string; date?: string; condition?: string };
  open_questions: string[];
  notes_for_followup: string;
}

export const CRM_ENTRY_CONTRACT: WorkflowStepContract<CRMEntryInput, CRMEntryOutput> = {
  step_name: 'crm_entry',
  description: 'Generate concise, actionable CRM record from approved summary and profile.',
  input: {} as CRMEntryInput,
  output: {} as CRMEntryOutput,
  validations: [
    {
      name: 'summary_and_profile_approved',
      description: 'Both meeting summary and profile must be approved',
      severity: 'error',
    },
    {
      name: 'tasks_present',
      description: 'At least one advisor or client task should be present',
      severity: 'warning',
    },
    {
      name: 'next_contact_defined',
      description: 'Next contact should be defined',
      severity: 'warning',
    },
    {
      name: 'conciseness_check',
      description: 'Total CRM entry should not exceed 500 words',
      severity: 'warning',
    },
  ],
  failure_modes: [
    {
      name: 'llm_api_error',
      description: 'LLM provider API fails',
      probability: 'low',
      impact: 'blocking',
      recovery: 'Retry with backoff',
    },
  ],
  human_review: {
    required: true,
    review_type: 'edit_and_approve',
    description: 'Advisor reviews CRM entry before export to CRM system.',
    timeout_hours: 48,
  },
  retry_policy: {
    max_retries: 2,
    backoff_type: 'exponential',
    initial_delay_ms: 2000,
    retryable_errors: ['llm_api_error', 'network_error'],
  },
  timeout_ms: 60_000,
};

// ============================================================
// STEP 6: SPECIALIZED PLANNING MODULE
// ============================================================

export interface PlanningModuleInput {
  case_id: string;
  client_id: string;
  domain: 'life_insurance' | 'investments' | 'mortgage' | 'property_insurance';
  mode: 'new_client' | 'review' | 'comparison' | 'optimization' | 'specific_request';
  approved_profile: object;
  approved_summary: object;
  source_documents?: Array<{
    document_id: string;
    document_type: string;
    extracted_text: string;
  }>;
  specific_request?: string;
}

export interface PlanningModuleOutput {
  report_id: string;
  domain: string;
  executive_summary: string;
  current_state: object;
  gaps: Array<{ area: string; severity: string; description: string }>;
  recommendations: Array<{ title: string; priority: string; rationale: string }>;
  comparison?: object;
  action_items: Array<{ description: string; responsible: string }>;
  data_completeness_score: number;
  assumptions: Array<{ description: string; basis: string }>;
}

export const PLANNING_MODULE_CONTRACT: WorkflowStepContract<PlanningModuleInput, PlanningModuleOutput> = {
  step_name: 'planning_module',
  description: 'Run specialized financial analysis for a specific domain.',
  input: {} as PlanningModuleInput,
  output: {} as PlanningModuleOutput,
  validations: [
    {
      name: 'profile_approved',
      description: 'Client profile must be in approved state',
      severity: 'error',
    },
    {
      name: 'domain_data_sufficient',
      description: 'Minimum required data for the domain must be present',
      severity: 'warning',
    },
    {
      name: 'recommendations_sourced',
      description: 'Every recommendation must cite data source or assumption',
      severity: 'error',
    },
    {
      name: 'no_unsupported_claims',
      description: 'Do not state facts not supported by input data',
      severity: 'error',
    },
  ],
  failure_modes: [
    {
      name: 'insufficient_data',
      description: 'Not enough client data for meaningful analysis',
      probability: 'high',
      impact: 'degraded',
      recovery: 'Generate partial report with clear "insufficient data" markers',
    },
    {
      name: 'llm_api_error',
      description: 'LLM provider API fails',
      probability: 'low',
      impact: 'blocking',
      recovery: 'Retry with backoff',
    },
  ],
  human_review: {
    required: true,
    review_type: 'edit_and_approve',
    description: 'Advisor MUST review specialized planning report before any client-facing use.',
    timeout_hours: 168, // 1 week
  },
  retry_policy: {
    max_retries: 2,
    backoff_type: 'exponential',
    initial_delay_ms: 2000,
    retryable_errors: ['llm_api_error', 'network_error'],
  },
  timeout_ms: 180_000,
};

// ============================================================
// STEP 7: CLIENT OUTPUT GENERATION
// ============================================================

export interface ClientOutputInput {
  case_id: string;
  client_id: string;
  output_type: string;
  approved_summary: object;
  approved_profile: object;
  approved_reports?: object[];
  product_knowledge?: object;
  tone?: 'formal' | 'friendly' | 'educational';
  language?: string; // Default: "cs"
}

export interface ClientOutputOutput {
  output_id: string;
  output_type: string;
  title: string;
  content: {
    format: string;
    body: string;
    sections?: Array<{ title: string; body: string }>;
  };
}

export const CLIENT_OUTPUT_CONTRACT: WorkflowStepContract<ClientOutputInput, ClientOutputOutput> = {
  step_name: 'client_output',
  description: 'Generate client-facing content from approved internal outputs.',
  input: {} as ClientOutputInput,
  output: {} as ClientOutputOutput,
  validations: [
    {
      name: 'all_sources_approved',
      description: 'All input reports and profiles must be in approved state',
      severity: 'error',
    },
    {
      name: 'no_internal_data_leak',
      description: 'Output must not contain internal notes, confidence scores, or raw advisor comments',
      severity: 'error',
    },
    {
      name: 'no_pii_in_output',
      description: 'Verify no unnecessary PII in client output (e.g., birth numbers, full account numbers)',
      severity: 'error',
    },
    {
      name: 'readability_check',
      description: 'Content should be written at accessible reading level',
      severity: 'warning',
    },
  ],
  failure_modes: [
    {
      name: 'llm_api_error',
      description: 'LLM provider API fails',
      probability: 'low',
      impact: 'blocking',
      recovery: 'Retry with backoff',
    },
    {
      name: 'pii_leak_detected',
      description: 'PII scanner detects sensitive data in generated output',
      probability: 'medium',
      impact: 'blocking',
      recovery: 'Auto-redact and flag for human review',
    },
  ],
  human_review: {
    required: true,
    review_type: 'edit_and_approve',
    description: 'Advisor MUST review all client-facing output before delivery.',
    timeout_hours: 168,
  },
  retry_policy: {
    max_retries: 2,
    backoff_type: 'exponential',
    initial_delay_ms: 2000,
    retryable_errors: ['llm_api_error', 'network_error'],
  },
  timeout_ms: 120_000,
};
