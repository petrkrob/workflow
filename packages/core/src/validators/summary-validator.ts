/**
 * Summary Validator — validates MeetingSummary output from LLM.
 * Ensures structural correctness and basic quality checks.
 */

import { MeetingSummary } from '../entities/meeting-summary';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning';
}

/**
 * Validate a MeetingSummary object for structural and quality requirements.
 */
export function validateMeetingSummary(summary: Partial<MeetingSummary>): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // Required fields
  if (!summary.meeting_context) {
    errors.push({ code: 'MISSING_CONTEXT', message: 'meeting_context is required', field: 'meeting_context', severity: 'error' });
  } else {
    if (!summary.meeting_context.participants || summary.meeting_context.participants.length === 0) {
      errors.push({ code: 'NO_PARTICIPANTS', message: 'At least one participant required', field: 'meeting_context.participants', severity: 'error' });
    }
    if (!summary.meeting_context.meeting_date) {
      warnings.push({ code: 'NO_DATE', message: 'Meeting date not specified', field: 'meeting_context.meeting_date', severity: 'warning' });
    }
  }

  // Topics
  if (!summary.discussed_topics || summary.discussed_topics.length === 0) {
    warnings.push({ code: 'NO_TOPICS', message: 'No discussed topics extracted', field: 'discussed_topics', severity: 'warning' });
  }

  // Financial facts confidence check
  if (summary.financial_facts) {
    const unsourced = summary.financial_facts.filter(f => !f.source);
    if (unsourced.length > 0) {
      errors.push({
        code: 'UNSOURCED_FACTS',
        message: `${unsourced.length} financial fact(s) missing source attribution`,
        field: 'financial_facts',
        severity: 'error',
      });
    }
  }

  // Next step
  if (!summary.next_step || summary.next_step.trim().length === 0) {
    warnings.push({ code: 'NO_NEXT_STEP', message: 'Next step not defined', field: 'next_step', severity: 'warning' });
  }

  // Extraction metadata
  if (summary.extraction_metadata) {
    if (summary.extraction_metadata.extraction_confidence < 60) {
      warnings.push({
        code: 'LOW_CONFIDENCE',
        message: `Low extraction confidence: ${summary.extraction_metadata.extraction_confidence}%`,
        field: 'extraction_metadata.extraction_confidence',
        severity: 'warning',
      });
    }
  }

  // Check for potential hallucination markers
  if (summary.financial_facts) {
    const inferred = summary.financial_facts.filter(f => f.confidence === 'inferred');
    if (inferred.length > 5) {
      warnings.push({
        code: 'MANY_INFERRED_FACTS',
        message: `${inferred.length} inferred facts — high hallucination risk, review carefully`,
        field: 'financial_facts',
        severity: 'warning',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
