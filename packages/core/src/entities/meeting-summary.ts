/**
 * MeetingSummary — structured extraction from transcript.
 * Connects scattered information into coherent topics.
 */

export interface MeetingSummary {
  summary_id: string;
  case_id: string;
  transcript_id: string;
  created_at: string;
  updated_at: string;

  // Meeting context
  meeting_context: MeetingContext;

  // Extracted content
  discussed_topics: DiscussedTopic[];
  financial_facts: FinancialFact[];
  client_goals: ExtractedGoal[];
  client_concerns: ExtractedConcern[];
  current_products_mentioned: ProductMention[];
  desired_changes: DesiredChange[];

  // Agreements and tasks
  agreements: Agreement[];
  advisor_tasks: TaskItem[];
  client_tasks: TaskItem[];

  // Gaps and follow-ups
  missing_information: MissingInfo[];
  follow_up_items: FollowUpItem[];
  next_step: string;

  // Quality metadata
  extraction_metadata: ExtractionMetadata;

  // Human review
  review_status: 'pending' | 'approved' | 'edited_and_approved' | 'rejected';
  reviewer_notes?: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface MeetingContext {
  participants: Participant[];
  meeting_type: string;
  meeting_date: string;
  duration_minutes?: number;
  location?: string;
  general_mood?: string;
}

export interface Participant {
  name?: string;
  role: 'advisor' | 'client' | 'partner' | 'other';
  notes?: string;
}

export interface DiscussedTopic {
  topic: string;
  category?: 'insurance' | 'investment' | 'mortgage' | 'retirement' | 'savings' | 'tax' | 'estate' | 'general' | 'other';
  key_points: string[];
  source_segments?: string[]; // References to transcript segment IDs
}

export interface FinancialFact {
  fact: string;
  category: string;
  value?: string;
  confidence: 'confirmed' | 'mentioned' | 'inferred' | 'uncertain';
  source: 'client_statement' | 'document' | 'advisor_observation' | 'inferred';
  source_segments?: string[];
}

export interface ExtractedGoal {
  description: string;
  timeframe?: 'short_term' | 'medium_term' | 'long_term';
  priority?: 'high' | 'medium' | 'low';
  confidence: 'explicit' | 'inferred';
}

export interface ExtractedConcern {
  description: string;
  severity?: 'high' | 'medium' | 'low';
  related_topic?: string;
}

export interface ProductMention {
  product_name?: string;
  provider?: string;
  type?: string;
  context: 'existing' | 'proposed' | 'discussed' | 'to_be_reviewed';
  details?: string;
}

export interface DesiredChange {
  description: string;
  area: string;
  urgency?: 'immediate' | 'soon' | 'future';
  agreed?: boolean;
}

export interface Agreement {
  description: string;
  responsible: 'advisor' | 'client' | 'both';
  deadline?: string;
}

export interface TaskItem {
  task_id: string;
  description: string;
  assigned_to: 'advisor' | 'client';
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
  status: 'open' | 'in_progress' | 'completed';
}

export interface MissingInfo {
  description: string;
  category: string;
  importance: 'critical' | 'important' | 'nice_to_have';
  suggested_question?: string;
}

export interface FollowUpItem {
  description: string;
  type: 'action' | 'question' | 'document_request' | 'meeting';
  responsible: 'advisor' | 'client';
  deadline?: string;
}

export interface ExtractionMetadata {
  model_used: string;
  prompt_version: string;
  extraction_confidence: number; // 0-100
  processing_time_ms: number;
  warnings?: string[];
  data_layer_markers: DataLayerMarker[];
}

/**
 * Tracks the provenance of each piece of extracted data.
 * Critical for distinguishing facts from interpretations.
 */
export interface DataLayerMarker {
  field_path: string;
  layer: 'raw_data' | 'structured_extraction' | 'interpreted' | 'recommendation';
  source_reference?: string;
}
