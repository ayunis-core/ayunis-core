import { Injectable, Logger } from '@nestjs/common';
import { AnonymizationPort } from '../../application/ports/anonymization.port';
import { AnonymizationFailedError } from '../../application/anonymization.errors';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';
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
      // Every caller treats a detect() failure as fatal and fail-closed (the
      // user's message is blocked rather than sent unmasked), so this catch
      // is the single classification point. Transport failures and upstream
      // 5xx group under PROVIDER_UNAVAILABLE_*_ANONYMIZE; a 4xx means we
      // built a bad request and stays a distinct AnonymizationFailedError
      // (AYC-654).
      const providerError = wrapProviderFailure(error, {
        provider: 'anonymize',
      });
      if (providerError) {
        throw providerError;
      }
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
