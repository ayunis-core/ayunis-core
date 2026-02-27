import type { Logger } from '@nestjs/common';
import type { Counter, Histogram } from 'prom-client';
import { classifyInferenceError } from './classify-inference-error.helper';
import { safeMetric } from './metrics.utils';

export interface RecordInferenceMetricsOptions {
  histogram: Histogram<string>;
  errorCounter: Counter<string>;
  logger: Logger;
  model: string;
  provider: string;
  streaming: 'true' | 'false';
}

/**
 * Records inference duration and (optionally) error classification metrics.
 * Designed to be called from a `finally` block after inference completes.
 */
export function recordInferenceMetrics(
  opts: RecordInferenceMetricsOptions,
  durationMs: number,
  error?: unknown,
): void {
  safeMetric(opts.logger, () => {
    opts.histogram.observe(
      {
        model: opts.model,
        provider: opts.provider,
        streaming: opts.streaming,
      },
      durationMs / 1000,
    );
  });

  if (error) {
    safeMetric(opts.logger, () => {
      opts.errorCounter.inc({
        model: opts.model,
        provider: opts.provider,
        error_type: classifyInferenceError(error),
        streaming: opts.streaming,
      });
    });
  }
}
