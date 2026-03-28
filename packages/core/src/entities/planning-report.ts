/**
 * PlanningReport — output of specialized financial modules.
 * Each domain (life insurance, investments, mortgage, property) produces one.
 */

import { PlanningDomain } from './meeting-case';

export interface PlanningReport {
  report_id: string;
  case_id: string;
  client_id: string;
  domain: PlanningDomain;
  created_at: string;
  updated_at: string;

  // Analysis mode
  mode: PlanningMode;

  // Content
  executive_summary: string;
  current_state_analysis: CurrentStateAnalysis;
  identified_gaps: Gap[];
  recommendations: Recommendation[];
  comparison?: ProductComparison; // For review/comparison modes
  action_items: PlanningActionItem[];

  // Data quality
  data_completeness: DataCompleteness;
  assumptions: Assumption[];

  // Review
  review_status: 'pending' | 'approved' | 'edited_and_approved' | 'rejected';
  reviewed_at?: string;
  reviewed_by?: string;

  // Generation metadata
  generation_metadata: {
    model_used: string;
    prompt_version: string;
    source_documents: string[];
    processing_time_ms: number;
  };
}

export type PlanningMode =
  | 'new_client'        // First-time analysis
  | 'review'            // Review existing coverage
  | 'comparison'        // Compare old vs new
  | 'optimization'      // Optimize existing setup
  | 'specific_request'; // Client-initiated specific query

export interface CurrentStateAnalysis {
  summary: string;
  existing_products: ExistingProductAnalysis[];
  strengths: string[];
  weaknesses: string[];
  risks: string[];
}

export interface ExistingProductAnalysis {
  product_name: string;
  provider: string;
  type: string;
  assessment: 'adequate' | 'insufficient' | 'excessive' | 'needs_review' | 'unknown';
  details: string;
  monthly_cost?: number;
}

export interface Gap {
  area: string;
  severity: 'critical' | 'significant' | 'minor';
  description: string;
  potential_impact: string;
  recommended_action: string;
}

export interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  rationale: string;
  estimated_monthly_cost?: number;
  confidence: 'high' | 'medium' | 'low';
  data_source: 'client_data' | 'market_standard' | 'advisor_judgement' | 'inferred';
}

export interface ProductComparison {
  old_product: ComparisonItem;
  new_product: ComparisonItem;
  differences: ComparisonDifference[];
  overall_assessment: string;
  recommendation: 'switch' | 'keep_current' | 'needs_discussion' | 'insufficient_data';
}

export interface ComparisonItem {
  name: string;
  provider: string;
  key_parameters: Record<string, string>;
  monthly_cost: number;
  coverage_summary: string;
}

export interface ComparisonDifference {
  parameter: string;
  old_value: string;
  new_value: string;
  assessment: 'better' | 'worse' | 'neutral' | 'depends';
  note?: string;
}

export interface PlanningActionItem {
  description: string;
  responsible: 'advisor' | 'client';
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
}

export interface DataCompleteness {
  score: number; // 0-100
  available_fields: string[];
  missing_fields: MissingField[];
}

export interface MissingField {
  field: string;
  importance: 'critical' | 'important' | 'nice_to_have';
  suggested_question?: string;
}

export interface Assumption {
  description: string;
  basis: 'market_standard' | 'common_practice' | 'conservative_estimate' | 'client_hint';
  impact_if_wrong: string;
}
