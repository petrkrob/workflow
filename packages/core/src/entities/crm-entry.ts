/**
 * CRMEntry — actionable, concise record for CRM systems (e.g. Pipedrive).
 * Optimized for quick advisor reference and follow-up tracking.
 */

export interface CRMEntry {
  crm_entry_id: string;
  case_id: string;
  client_id: string;
  created_at: string;
  updated_at: string;

  // Core CRM content
  top_priorities: string[];
  agreed_actions: string[];
  advisor_tasks: CRMTask[];
  client_tasks: CRMTask[];
  next_contact: NextContact;
  open_questions: string[];
  notes_for_followup: string;

  // Optional structured fields for CRM integration
  deal_stage?: string;
  deal_value?: number;
  tags?: string[];

  // Review
  review_status: 'pending' | 'approved' | 'edited_and_approved' | 'rejected';
  reviewed_at?: string;
  reviewed_by?: string;

  // Export
  exported_to_crm?: boolean;
  exported_at?: string;
  crm_record_id?: string; // External CRM ID after export

  // Generation metadata
  generation_metadata: {
    model_used: string;
    prompt_version: string;
    source_summary_id: string;
    source_profile_id?: string;
  };
}

export interface CRMTask {
  description: string;
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
  status: 'open' | 'in_progress' | 'completed';
}

export interface NextContact {
  type: 'meeting' | 'phone' | 'email' | 'other';
  date?: string;
  condition?: string; // e.g. "after client sends documents"
  notes?: string;
}
