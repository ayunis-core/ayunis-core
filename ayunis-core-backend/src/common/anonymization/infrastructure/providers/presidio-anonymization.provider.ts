import { Injectable, Logger } from '@nestjs/common';
import {
  AnonymizationPort,
  AnonymizationResult,
  AnonymizationReplacement,
} from '../../application/ports/anonymization.port';
import { AnonymizationFailedError } from '../../application/anonymization.errors';
import { getMSPresidioPIIDetectionAPI } from 'src/common/clients/anonymize/generated/mSPresidioPIIDetectionAPI';
import type { RecognizerResult } from 'src/common/clients/anonymize/generated/mSPresidioPIIDetectionAPI.schemas';

@Injectable()
export class PresidioAnonymizationProvider extends AnonymizationPort {
  private readonly logger = new Logger(PresidioAnonymizationProvider.name);

  async anonymize(
    text: string,
    entities?: string[],
  ): Promise<AnonymizationResult> {
    this.logger.debug('Anonymizing text', {
      textLength: text.length,
      entities,
    });

    try {
      const client = getMSPresidioPIIDetectionAPI();

      const response = await client.analyzeTextAnalyzePost({
        text,
        entities: entities ?? null,
      });

      const nonOverlappingResults = this.dropOverlappingResults(
        response.results,
      );
      const replacements = this.buildReplacements(text, nonOverlappingResults);
      const anonymizedText = this.applyReplacements(
        text,
        nonOverlappingResults,
      );

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

  // GLiNER runs with flat_ner=False and can return nested/overlapping spans
  // for the same text (e.g. "Dani" and "der Dani" both as PERSON). Applying
  // them both with naive offset-based substitution corrupts the output
  // (e.g. "[PERSON]SON]"), so keep only the outermost of each overlap chain.
  private dropOverlappingResults(
    results: RecognizerResult[],
  ): RecognizerResult[] {
    if (results.length < 2) {
      return results;
    }

    const sorted = [...results].sort(
      (a, b) => a.start - b.start || b.end - a.end,
    );

    const kept: RecognizerResult[] = [];
    let lastEnd = -1;
    for (const result of sorted) {
      if (result.start >= lastEnd) {
        kept.push(result);
        lastEnd = result.end;
      }
    }
    return kept;
  }
}
