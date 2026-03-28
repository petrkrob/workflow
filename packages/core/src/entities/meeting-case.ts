/**
 * MeetingCase — container for a single meeting/session.
 * Tracks all inputs, workflow state, and outputs for one case.
 */

export type StepStatus = 'pending' | 'processing' | 'awaiting_review' | 'approved' | 'failed' | 'skipped';

export type PlanningDomain = 'life_insurance' | 'investments' | 'mortgage' | 'property_insurance';

export interface MeetingCase {
  case_id: string;
  client_id: string;
  advisor_id: string;
  created_at: string; // ISO 8601
  updated_at: string;

  // Meeting metadata
  meeting_date: string;
  meeting_type?: 'initial' | 'follow_up' | 'review' | 'closing' | 'other';
  meeting_notes?: string;

  // Input files
  source_files: SourceFileReference[];

  // Workflow state
  workflow_state: WorkflowState;

  // Generated outputs (references)
  transcript_id?: string;
  summary_id?: string;
  profile_snapshot_id?: string;
  crm_entry_id?: string;
  planning_report_ids?: Record<PlanningDomain, string>;
  client_output_ids?: string[];

  // Metadata
  metadata: CaseMetadata;
}

export interface WorkflowState {
  intake: StepStatus;
  transcription: StepStatus;
  summary: StepStatus;
  profile_update: StepStatus;
  crm_entry: StepStatus;
  planning_modules: Record<PlanningDomain, StepStatus>;
  client_outputs: StepStatus;
}

export interface SourceFileReference {
  file_id: string;
  filename: string;
  file_type: 'audio' | 'document' | 'image' | 'spreadsheet' | 'other';
  purpose: 'meeting_recording' | 'existing_contract' | 'new_model' | 'product_info' | 'advisor_notes' | 'other';
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
  metadata?: Record<string, string>;
}

export interface CaseMetadata {
  total_processing_time_ms?: number;
  last_step_completed?: string;
  error_log?: WorkflowError[];
  version: number;
}

export interface WorkflowError {
  step: string;
  error_code: string;
  message: string;
  timestamp: string;
  recoverable: boolean;
}

/**
 * Factory for creating a new MeetingCase with default workflow state.
 */
export function createDefaultWorkflowState(): WorkflowState {
  return {
    intake: 'pending',
    transcription: 'pending',
    summary: 'pending',
    profile_update: 'pending',
    crm_entry: 'pending',
    planning_modules: {
      life_insurance: 'pending',
      investments: 'pending',
      mortgage: 'pending',
      property_insurance: 'pending',
    },
    client_outputs: 'pending',
  };
}
