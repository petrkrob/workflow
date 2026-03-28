/**
 * Completeness Scorer — calculates how complete a client profile is.
 * Returns 0-100 score with details of missing fields.
 */

import { Client } from '../entities/client';

interface CompletenessResult {
  score: number; // 0-100
  filledFields: string[];
  missingFields: MissingFieldInfo[];
  categoryScores: Record<string, { score: number; weight: number }>;
}

interface MissingFieldInfo {
  field: string;
  category: string;
  importance: 'critical' | 'important' | 'nice_to_have';
  suggestedQuestion?: string;
}

interface CategoryWeight {
  weight: number;
  fields: FieldCheck[];
}

interface FieldCheck {
  path: string;
  label: string;
  importance: 'critical' | 'important' | 'nice_to_have';
  suggestedQuestion?: string;
}

const CATEGORY_WEIGHTS: Record<string, CategoryWeight> = {
  personal_basics: {
    weight: 10,
    fields: [
      { path: 'personal.full_name', label: 'Jméno', importance: 'critical' },
      { path: 'personal.birth_year', label: 'Rok narození', importance: 'important', suggestedQuestion: 'Jaký je váš rok narození?' },
      { path: 'personal.marital_status', label: 'Rodinný stav', importance: 'important', suggestedQuestion: 'Jaký je váš rodinný stav?' },
    ],
  },
  household: {
    weight: 5,
    fields: [
      { path: 'household.dependents_count', label: 'Počet vyživovaných osob', importance: 'important', suggestedQuestion: 'Kolik máte vyživovaných osob?' },
      { path: 'household.household_members', label: 'Počet členů domácnosti', importance: 'nice_to_have' },
    ],
  },
  income_employment: {
    weight: 15,
    fields: [
      { path: 'economic.employment_status', label: 'Ekonomický status', importance: 'critical', suggestedQuestion: 'Jste zaměstnaný, OSVČ, nebo jinak?' },
      { path: 'economic.profession', label: 'Profese', importance: 'important', suggestedQuestion: 'Jaká je vaše profese?' },
      { path: 'economic.net_monthly_income', label: 'Čistý měsíční příjem', importance: 'critical', suggestedQuestion: 'Jaký je váš čistý měsíční příjem?' },
    ],
  },
  expenses_obligations: {
    weight: 10,
    fields: [
      { path: 'economic.monthly_household_expenses', label: 'Měsíční výdaje domácnosti', importance: 'important', suggestedQuestion: 'Jaké jsou vaše přibližné měsíční výdaje?' },
      { path: 'economic.monthly_obligations', label: 'Měsíční závazky', importance: 'important', suggestedQuestion: 'Jaké máte pravidelné měsíční závazky (splátky, pojistné)?' },
      { path: 'economic.liquid_reserve', label: 'Likvidní rezerva', importance: 'important', suggestedQuestion: 'Jakou máte finanční rezervu na účtu?' },
    ],
  },
  assets: {
    weight: 10,
    fields: [
      { path: 'assets.real_estate', label: 'Nemovitosti', importance: 'important', suggestedQuestion: 'Vlastníte nějaké nemovitosti?' },
      { path: 'assets.savings', label: 'Úspory', importance: 'important' },
      { path: 'assets.investment_products', label: 'Investiční produkty', importance: 'important' },
    ],
  },
  insurance: {
    weight: 15,
    fields: [
      { path: 'assets.life_insurance', label: 'Životní pojištění', importance: 'critical', suggestedQuestion: 'Máte životní pojištění? U které pojišťovny?' },
      { path: 'assets.property_insurance', label: 'Majetkové pojištění', importance: 'important', suggestedQuestion: 'Máte pojištěnou nemovitost a domácnost?' },
    ],
  },
  credit: {
    weight: 10,
    fields: [
      { path: 'assets.credit_products', label: 'Úvěrové produkty', importance: 'important', suggestedQuestion: 'Máte nějaké úvěry nebo hypotéku?' },
    ],
  },
  retirement: {
    weight: 10,
    fields: [
      { path: 'retirement.pension_pillar_3', label: 'Penzijní spoření', importance: 'important', suggestedQuestion: 'Máte penzijní spoření (III. pilíř)?' },
      { path: 'retirement.disability_coverage', label: 'Krytí invalidity', importance: 'critical', suggestedQuestion: 'Máte zajištění pro případ invalidity?' },
    ],
  },
  risk_profile: {
    weight: 5,
    fields: [
      { path: 'risk_profile.risk_tolerance', label: 'Vztah k riziku', importance: 'important', suggestedQuestion: 'Jak byste popsal/a svůj vztah k investičnímu riziku?' },
      { path: 'risk_profile.investment_horizon', label: 'Investiční horizont', importance: 'nice_to_have' },
    ],
  },
  goals: {
    weight: 10,
    fields: [
      { path: 'goals.top_priorities', label: 'Hlavní priority', importance: 'critical', suggestedQuestion: 'Co je pro vás teď finančně nejdůležitější?' },
      { path: 'goals.short_term', label: 'Krátkodobé cíle', importance: 'nice_to_have' },
      { path: 'goals.long_term', label: 'Dlouhodobé cíle', importance: 'important', suggestedQuestion: 'Jaké máte dlouhodobé finanční cíle?' },
    ],
  },
};

/**
 * Calculate completeness score for a client profile.
 */
export function calculateCompleteness(profile: Client): CompletenessResult {
  const filledFields: string[] = [];
  const missingFields: MissingFieldInfo[] = [];
  const categoryScores: Record<string, { score: number; weight: number }> = {};

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const [categoryName, category] of Object.entries(CATEGORY_WEIGHTS)) {
    let categoryFilled = 0;
    const categoryTotal = category.fields.length;

    for (const field of category.fields) {
      const value = getNestedValue(profile, field.path);
      const isFilled = isFieldFilled(value);

      if (isFilled) {
        filledFields.push(field.path);
        categoryFilled++;
      } else {
        missingFields.push({
          field: field.label,
          category: categoryName,
          importance: field.importance,
          suggestedQuestion: field.suggestedQuestion,
        });
      }
    }

    const categoryScore = categoryTotal > 0 ? (categoryFilled / categoryTotal) * 100 : 0;
    categoryScores[categoryName] = { score: categoryScore, weight: category.weight };
    totalWeightedScore += categoryScore * category.weight;
    totalWeight += category.weight;
  }

  const overallScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;

  // Sort missing fields by importance
  const importanceOrder = { critical: 0, important: 1, nice_to_have: 2 };
  missingFields.sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance]);

  return {
    score: overallScore,
    filledFields,
    missingFields,
    categoryScores,
  };
}

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function isFieldFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return false;
}
