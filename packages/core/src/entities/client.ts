/**
 * Client entity — long-lived, cumulative record of a client.
 * Updated after each meeting via ClientProfile merge.
 */

export interface Client {
  client_id: string;
  created_at: string; // ISO 8601
  updated_at: string;

  // Basic identification
  personal: ClientPersonal;
  household: ClientHousehold;

  // Economic situation
  economic: ClientEconomic;

  // Assets and liabilities
  assets: ClientAssets;

  // Retirement and security
  retirement: ClientRetirement;

  // Risk profile
  risk_profile: ClientRiskProfile;

  // Goals and priorities
  goals: ClientGoals;

  // Behavioral / psychological context
  behavioral: ClientBehavioral;

  // Collaboration history
  history: ClientHistory;

  // Metadata
  metadata: ClientMetadata;
}

export interface ClientPersonal {
  full_name: string;
  internal_id?: string;
  birth_year?: number;
  date_of_birth?: string;
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | 'partnership' | 'unknown';
  email?: string;
  phone?: string;
  address?: string;
}

export interface ClientHousehold {
  dependents_count?: number;
  dependents_details?: string[];
  household_members?: number;
  household_description?: string;
}

export interface ClientEconomic {
  employment_status?: 'employed' | 'self_employed' | 'unemployed' | 'retired' | 'student' | 'parental_leave' | 'unknown';
  profession?: string;
  employer?: string;
  net_monthly_income?: MoneyAmount;
  other_income?: IncomeSource[];
  monthly_household_expenses?: MoneyAmount;
  monthly_obligations?: MoneyAmount;
  liquid_reserve?: MoneyAmount;
}

export interface ClientAssets {
  real_estate?: AssetItem[];
  savings?: AssetItem[];
  investment_products?: InvestmentProduct[];
  credit_products?: CreditProduct[];
  property_insurance?: InsuranceProduct[];
  life_insurance?: InsuranceProduct[];
  other_assets?: AssetItem[];
}

export interface ClientRetirement {
  pension_pillar_1?: string; // state pension info
  pension_pillar_2?: string; // employer scheme
  pension_pillar_3?: PensionProduct[]; // private savings
  disability_coverage?: string;
  income_protection?: string;
  long_term_financial_goals?: string[];
}

export interface ClientRiskProfile {
  risk_tolerance?: 'conservative' | 'moderate' | 'balanced' | 'growth' | 'aggressive' | 'unknown';
  liquidity_preference?: 'high' | 'medium' | 'low' | 'unknown';
  income_stability?: 'stable' | 'variable' | 'unstable' | 'unknown';
  uncertainty_tolerance?: 'low' | 'medium' | 'high' | 'unknown';
  investment_horizon?: string;
}

export interface ClientGoals {
  short_term?: GoalItem[]; // < 1 year
  medium_term?: GoalItem[]; // 1-5 years
  long_term?: GoalItem[]; // 5+ years
  top_priorities?: string[];
}

export interface ClientBehavioral {
  concerns?: string[];
  motivations?: string[];
  objections?: string[];
  communication_preference?: string;
  decision_style?: string;
  notes?: string;
}

export interface ClientHistory {
  previous_meetings?: MeetingReference[];
  open_topics?: string[];
  open_tasks?: TaskReference[];
  unresolved_areas?: string[];
}

export interface ClientMetadata {
  profile_completeness_score?: number; // 0-100
  last_meeting_date?: string;
  total_meetings?: number;
  data_quality_notes?: string[];
}

// Supporting types

export interface MoneyAmount {
  amount: number;
  currency: string; // ISO 4217, default "CZK"
}

export interface IncomeSource {
  source: string;
  amount: MoneyAmount;
  frequency?: 'monthly' | 'quarterly' | 'yearly' | 'one_time';
}

export interface AssetItem {
  name: string;
  type?: string;
  estimated_value?: MoneyAmount;
  notes?: string;
}

export interface InvestmentProduct {
  name: string;
  provider?: string;
  type?: string;
  current_value?: MoneyAmount;
  monthly_contribution?: MoneyAmount;
  start_date?: string;
  notes?: string;
}

export interface CreditProduct {
  name: string;
  provider?: string;
  type?: 'mortgage' | 'consumer_loan' | 'credit_card' | 'overdraft' | 'other';
  outstanding_balance?: MoneyAmount;
  monthly_payment?: MoneyAmount;
  interest_rate?: number;
  end_date?: string;
  notes?: string;
}

export interface InsuranceProduct {
  name: string;
  provider?: string;
  policy_number?: string;
  type?: string;
  monthly_premium?: MoneyAmount;
  coverage_summary?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface PensionProduct {
  name: string;
  provider?: string;
  type?: string;
  current_value?: MoneyAmount;
  monthly_contribution?: MoneyAmount;
  employer_contribution?: MoneyAmount;
  notes?: string;
}

export interface GoalItem {
  description: string;
  target_amount?: MoneyAmount;
  target_date?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface MeetingReference {
  case_id: string;
  date: string;
  summary_snippet?: string;
}

export interface TaskReference {
  task_id: string;
  description: string;
  assigned_to: 'advisor' | 'client';
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
}
