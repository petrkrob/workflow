/**
 * AuditLogEntry — immutable record of every significant action.
 * Provides full traceability from output back to source.
 */

export interface AuditLogEntry {
  log_id: string;
  timestamp: string; // ISO 8601
  case_id?: string;
  client_id?: string;
  user_id: string; // Advisor or system

  // Action
  action: AuditAction;
  entity_type: string;
  entity_id: string;

  // Details
  description: string;
  changes?: AuditChange[];

  // AI-specific
  ai_metadata?: AIAuditMetadata;

  // Security
  ip_address?: string;
  pii_accessed?: boolean;
}

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'export'
  | 'view'
  | 'generate'
  | 'regenerate'
  | 'access_pii'
  | 'redact'
  | 'upload'
  | 'download';

export interface AuditChange {
  field: string;
  old_value?: string;
  new_value?: string;
}

export interface AIAuditMetadata {
  model_used: string;
  prompt_version: string;
  input_token_count?: number;
  output_token_count?: number;
  processing_time_ms?: number;
  confidence_score?: number;
}
