import { Injectable, Logger } from '@nestjs/common';
import {
  AnonymizationPort,
  AnonymizationResult,
  AnonymizationLanguage,
  AnonymizationReplacement,
} from '../../application/ports/anonymization.port';
import { AnonymizationFailedError } from '../../application/anonymization.errors';
import { getMSPresidioPIIDetectionAPI } from 'src/common/clients/anonymize/generated/mSPresidioPIIDetectionAPI';
import type {
  Language,
  RecognizerResult,
} from 'src/common/clients/anonymize/generated/mSPresidioPIIDetectionAPI.schemas';

@Injectable()
export class PresidioAnonymizationProvider extends AnonymizationPort {
  private readonly logger = new Logger(PresidioAnonymizationProvider.name);

  async anonymize(
    text: string,
    language: AnonymizationLanguage,
    entities?: string[],
  ): Promise<AnonymizationResult> {
    this.logger.debug('Anonymizing text', {
      textLength: text.length,
      language,
      entities,
    });

    try {
      const client = getMSPresidioPIIDetectionAPI();

      const response = await client.analyzeTextAnalyzePost({
        text,
        language: language as Language,
        entities: entities ?? null,
      });

      const replacements = this.buildReplacements(text, response.results);
      const anonymizedText = this.applyReplacements(text, response.results);

      this.logger.debug('Anonymization complete', {
        originalLength: text.length,
        anonymizedLength: anonymizedText.length,
        replacementCount: replacements.length,
      });

      return {
        originalText: text,
        anonymizedText,
        replacements,
      };
    } catch (error: unknown) {
      this.logger.error('Anonymization failed', { error: error as Error });
      throw new AnonymizationFailedError(
        error instanceof Error ? error.message : 'Unknown error',
        { error: error as Error },
      );
    }
  }

  private buildReplacements(
    text: string,
    results: RecognizerResult[],
  ): AnonymizationReplacement[] {
    return results.map((result) => ({
      entityType: result.entity_type,
      originalValue: text.substring(result.start, result.end),
      start: result.start,
      end: result.end,
      score: result.score,
    }));
  }

  private applyReplacements(text: string, results: RecognizerResult[]): string {
    if (results.length === 0) {
      return text;
    }

    // Sort by end position descending to replace from end to start
    // This preserves character positions for earlier replacements
    const sortedResults = [...results].sort((a, b) => b.end - a.end);

    let anonymizedText = text;
    for (const result of sortedResults) {
      const replacement = `[${result.entity_type}]`;
      anonymizedText =
        anonymizedText.substring(0, result.start) +
        replacement +
        anonymizedText.substring(result.end);
    }

    return anonymizedText;
  }
}
