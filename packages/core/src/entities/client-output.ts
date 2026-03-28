/**
 * ClientOutput — client-facing deliverable generated from internal data.
 * These go through mandatory human review before delivery.
 */

export interface ClientOutput {
  output_id: string;
  case_id: string;
  client_id: string;
  created_at: string;
  updated_at: string;

  // Output type
  output_type: ClientOutputType;
  title: string;

  // Content
  content: ClientOutputContent;

  // Source tracking
  source_reports: string[]; // Planning report IDs
  source_summary_id: string;
  source_profile_id: string;

  // Review
  review_status: 'pending' | 'approved' | 'edited_and_approved' | 'rejected';
  reviewed_at?: string;
  reviewed_by?: string;

  // Delivery
  delivered: boolean;
  delivered_at?: string;
  delivery_method?: 'email' | 'portal' | 'in_person' | 'other';

  // Metadata
  generation_metadata: {
    model_used: string;
    prompt_version: string;
    processing_time_ms: number;
  };
}

export type ClientOutputType =
  | 'meeting_summary_email'    // Post-meeting email to client
  | 'podcast_script'           // Audio podcast script
  | 'video_script'             // Video script
  | 'html_summary'             // HTML landing page / overview
  | 'explanation_document'     // Detailed explanation of recommendations
  | 'comparison_document'      // Old vs new comparison for client
  | 'infographic_data'         // Structured data for infographic generation
  | 'presentation'             // Slide content
  | 'client_workbook'          // Interactive workbook / checklist
  | 'notebooklm_source';       // Formatted source for NotebookLM

export interface ClientOutputContent {
  format: 'markdown' | 'html' | 'json' | 'plain_text';
  body: string;
  sections?: ContentSection[];
  attachments?: string[]; // File IDs
}

export interface ContentSection {
  title: string;
  body: string;
  order: number;
}
