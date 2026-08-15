import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AnonymizationPort } from '../../application/ports/anonymization.port';
import {
  AnonymizationFailedError,
  AnonymizationInputTooLongError,
} from '../../application/anonymization.errors';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';
import { PiiDetection } from '../../domain/pii-detection';
import { mapPresidioEntityToCategory } from './presidio-entity-category.mapper';
import { getMSPresidioPIIDetectionAPI } from 'src/common/clients/anonymize/generated/mSPresidioPIIDetectionAPI';
import type { RecognizerResult } from 'src/common/clients/anonymize/generated/mSPresidioPIIDetectionAPI.schemas';

// Keep this synchronized with ayunis-core-anonymize/app/models.py.
const MAX_ANONYMIZATION_TEXT_LENGTH = 30_000;

function countCodePoints(text: string): number {
  let count = 0;
  for (let offset = 0; offset < text.length; offset += 1) {
    count += 1;
    if ((text.codePointAt(offset) ?? 0) > 0xffff) {
      offset += 1;
    }
  }
  return count;
}

@Injectable()
export class PresidioAnonymizationProvider extends AnonymizationPort {
  constructor(
    @InjectPinoLogger(PresidioAnonymizationProvider.name)
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  async detect(text: string, entities?: string[]): Promise<PiiDetection[]> {
    const textLength = countCodePoints(text);
    if (textLength > MAX_ANONYMIZATION_TEXT_LENGTH) {
      throw new AnonymizationInputTooLongError(
        textLength,
        MAX_ANONYMIZATION_TEXT_LENGTH,
      );
    }

    this.logger.debug({ textLength, entities }, 'Detecting PII');
    const startedAt = performance.now();

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

      this.logDetectionComplete(textLength, detections.length, startedAt);

      return detections;
    } catch (error: unknown) {
      this.logDetectionFailure(textLength, startedAt, error);
      // Every caller treats a service-call pipeline failure as fatal and
      // fail-closed (the user's message is blocked rather than sent unmasked),
      // so this catch is their single classification point. Transport failures
      // and upstream 5xx group under PROVIDER_UNAVAILABLE_*_ANONYMIZE. A
      // remaining 4xx means our request shape drifted despite local validation
      // and stays a distinct AnonymizationFailedError (AYC-654).
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

  private logDetectionComplete(
    textLength: number,
    detectionCount: number,
    startedAt: number,
  ): void {
    this.logger.info(
      {
        textLength,
        detectionCount,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      },
      'PII detection complete',
    );
  }

  private logDetectionFailure(
    textLength: number,
    startedAt: number,
    error: unknown,
  ): void {
    this.logger.error(
      {
        textLength,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
        err: error,
      },
      'PII detection failed',
    );
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
