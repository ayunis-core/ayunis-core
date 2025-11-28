export interface AnonymizationReplacement {
  entityType: string;
  originalValue: string;
  start: number;
  end: number;
  score: number;
}

export interface AnonymizationResult {
  originalText: string;
  anonymizedText: string;
  replacements: AnonymizationReplacement[];
}

export type AnonymizationLanguage = 'en' | 'de';

export abstract class AnonymizationPort {
  abstract anonymize(
    text: string,
    language: AnonymizationLanguage,
    entities?: string[],
  ): Promise<AnonymizationResult>;
}
