/**
 * SourceDocument and RedactedDocument — document handling with PII separation.
 */

export interface SourceDocument {
  document_id: string;
  case_id: string;
  client_id: string;
  created_at: string;

  // File info
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string; // Encrypted storage

  // Classification
  document_type: DocumentType;
  purpose: DocumentPurpose;

  // Extraction
  extracted_text?: string;
  extracted_entities?: ExtractedEntity[];
  parsing_status: 'pending' | 'parsed' | 'failed' | 'not_applicable';

  // Redaction
  redacted_version_id?: string;
  pii_detected: boolean;
  pii_entities?: PIIEntity[];
}

export type DocumentType =
  | 'insurance_contract'
  | 'investment_statement'
  | 'mortgage_contract'
  | 'bank_statement'
  | 'tax_return'
  | 'payslip'
  | 'property_valuation'
  | 'product_brochure'
  | 'model_calculation'
  | 'advisor_notes'
  | 'other';

export type DocumentPurpose =
  | 'existing_contract'
  | 'new_model'
  | 'product_info'
  | 'client_document'
  | 'reference_material'
  | 'other';

export interface ExtractedEntity {
  entity_type: string;
  value: string;
  confidence: number;
  location_in_document?: string;
}

export interface PIIEntity {
  pii_type: PIIType;
  original_value_hash: string; // Never store raw PII here
  token: string; // Internal replacement token
  location_in_document: string;
  confidence: number;
}

export type PIIType =
  | 'birth_number'     // Rodné číslo
  | 'contract_number'
  | 'bank_account'
  | 'address'
  | 'phone_number'
  | 'email'
  | 'date_of_birth'
  | 'employer'
  | 'health_data'
  | 'income'
  | 'child_info'
  | 'national_id'
  | 'other_pii';

/**
 * RedactedDocument — PII-stripped version for safer processing.
 */
export interface RedactedDocument {
  redacted_document_id: string;
  source_document_id: string;
  created_at: string;

  // Redacted content
  redacted_text: string;
  redaction_count: number;
  redaction_types: PIIType[];

  // Token map reference (stored separately, encrypted)
  token_map_id: string;

  // Metadata
  redaction_method: 'regex' | 'ner' | 'hybrid';
  redaction_confidence: number;
}

/**
 * TokenMap — maps internal tokens back to real PII values.
 * Stored encrypted, separately from redacted documents.
 * Access-controlled and audit-logged.
 */
export interface TokenMap {
  token_map_id: string;
  document_id: string;
  created_at: string;
  mappings: TokenMapping[];
}

export interface TokenMapping {
  token: string;
  pii_type: PIIType;
  // Actual value stored encrypted at rest
  encrypted_value: string;
}
