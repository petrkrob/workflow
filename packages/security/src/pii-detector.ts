/**
 * PII Detector — regex-based detection of Czech personal data.
 * MVP implementation. To be enhanced with NER in later versions.
 */

export interface PIIDetection {
  type: PIIType;
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

export type PIIType =
  | 'birth_number'
  | 'phone_number'
  | 'email'
  | 'bank_account'
  | 'date_of_birth'
  | 'contract_number'
  | 'address_zip';

interface PIIPattern {
  type: PIIType;
  pattern: RegExp;
  confidence: number;
  description: string;
}

/**
 * Czech-specific PII patterns.
 */
const PII_PATTERNS: PIIPattern[] = [
  {
    type: 'birth_number',
    // Czech rodné číslo: YYMMDD/XXXX or YYMMDD/XXX
    pattern: /\b(\d{2})(0[1-9]|1[0-2]|5[1-9]|6[0-2])([0-2]\d|3[01])\/?\d{3,4}\b/g,
    confidence: 0.95,
    description: 'Czech birth number (rodné číslo)',
  },
  {
    type: 'phone_number',
    // Czech phone: +420 XXX XXX XXX or various formats
    pattern: /(?:\+420[\s-]?)?\b[2-9]\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g,
    confidence: 0.8,
    description: 'Czech phone number',
  },
  {
    type: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    confidence: 0.95,
    description: 'Email address',
  },
  {
    type: 'bank_account',
    // Czech bank account: prefix-number/bank_code or IBAN
    pattern: /\b(?:\d{1,6}-)?(\d{2,10})\/(\d{4})\b/g,
    confidence: 0.85,
    description: 'Czech bank account number',
  },
  {
    type: 'bank_account',
    // IBAN
    pattern: /\bCZ\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g,
    confidence: 0.95,
    description: 'IBAN',
  },
  {
    type: 'date_of_birth',
    // Date patterns: DD.MM.YYYY or DD/MM/YYYY
    pattern: /\b(0[1-9]|[12]\d|3[01])\.(0[1-9]|1[0-2])\.(\d{4})\b/g,
    confidence: 0.6, // Lower confidence — could be any date
    description: 'Date (potential date of birth)',
  },
  {
    type: 'contract_number',
    // Insurance/investment contract numbers (various formats)
    pattern: /\b(?:smlouva|č\.|číslo|pojistka|smlouvy)\s*(?:č\.?\s*)?(\d{6,15})\b/gi,
    confidence: 0.7,
    description: 'Contract number',
  },
  {
    type: 'address_zip',
    // Czech ZIP code in address context
    pattern: /\b(\d{3})\s?(\d{2})\b(?=\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ])/g,
    confidence: 0.6,
    description: 'Czech ZIP code (PSČ)',
  },
];

/**
 * Detect PII in text.
 */
export function detectPII(text: string): PIIDetection[] {
  const detections: PIIDetection[] = [];

  for (const piiPattern of PII_PATTERNS) {
    // Reset regex state
    const regex = new RegExp(piiPattern.pattern.source, piiPattern.pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      detections.push({
        type: piiPattern.type,
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: piiPattern.confidence,
      });
    }
  }

  // Sort by position
  detections.sort((a, b) => a.startIndex - b.startIndex);

  // Deduplicate overlapping detections (keep higher confidence)
  return deduplicateOverlapping(detections);
}

/**
 * Redact detected PII from text, replacing with tokens.
 */
export function redactPII(text: string, detections: PIIDetection[]): {
  redactedText: string;
  tokenMap: Array<{ token: string; type: PIIType; originalValue: string }>;
} {
  const tokenMap: Array<{ token: string; type: PIIType; originalValue: string }> = [];

  // Process detections from end to start to preserve indices
  const sorted = [...detections].sort((a, b) => b.startIndex - a.startIndex);
  let redactedText = text;

  for (const detection of sorted) {
    const token = `[${detection.type.toUpperCase()}_${tokenMap.length + 1}]`;
    tokenMap.push({
      token,
      type: detection.type,
      originalValue: detection.value,
    });
    redactedText =
      redactedText.slice(0, detection.startIndex) +
      token +
      redactedText.slice(detection.endIndex);
  }

  // Reverse tokenMap to match text order
  tokenMap.reverse();

  return { redactedText, tokenMap };
}

function deduplicateOverlapping(detections: PIIDetection[]): PIIDetection[] {
  if (detections.length <= 1) return detections;

  const result: PIIDetection[] = [detections[0]];

  for (let i = 1; i < detections.length; i++) {
    const prev = result[result.length - 1];
    const curr = detections[i];

    if (curr.startIndex < prev.endIndex) {
      // Overlapping — keep the one with higher confidence
      if (curr.confidence > prev.confidence) {
        result[result.length - 1] = curr;
      }
    } else {
      result.push(curr);
    }
  }

  return result;
}
