import { Injectable, Logger } from '@nestjs/common';
import { AnonymizationPort } from '../../application/ports/anonymization.port';
import { AnonymizationFailedError } from '../../application/anonymization.errors';
import { PiiDetection } from '../../domain/pii-detection';
import { mapPresidioEntityToCategory } from './presidio-entity-category.mapper';
import { getMSPresidioPIIDetectionAPI } from 'src/common/clients/anonymize/generated/mSPresidioPIIDetectionAPI';
import type { RecognizerResult } from 'src/common/clients/anonymize/generated/mSPresidioPIIDetectionAPI.schemas';

@Injectable()
export class PresidioAnonymizationProvider extends AnonymizationPort {
  private readonly logger = new Logger(PresidioAnonymizationProvider.name);

  async detect(text: string, entities?: string[]): Promise<PiiDetection[]> {
    this.logger.debug('Detecting PII', {
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
      const detections = nonOverlappingResults.map((result) =>
        this.toDetection(text, result),
      );

      this.logger.debug('PII detection complete', {
        textLength: text.length,
        detectionCount: detections.length,
      });

      return detections;
    } catch (error: unknown) {
      this.logger.error('PII detection failed', { error: error as Error });
      throw new AnonymizationFailedError(
        error instanceof Error ? error.message : 'Unknown error',
        { error: error as Error },
      );
    }
  }

  private toDetection(text: string, result: RecognizerResult): PiiDetection {
    return {
      entityType: result.entity_type,
      category: mapPresidioEntityToCategory(result.entity_type),
      text: text.substring(result.start, result.end),
      start: result.start,
      end: result.end,
      score: result.score,
    };
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
