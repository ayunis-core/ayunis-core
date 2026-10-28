import { HttpException } from '@nestjs/common';
import { setError } from '@appsignal/nodejs';
import { ApplicationError } from './base.error';
import {
  findProviderUnavailableError,
  reportProviderUnavailableMetric,
} from './report-provider-unavailable-metric.helper';

/**
 * The reporting rule of ApplicationErrorFilter, extracted for response paths
 * the filter can never reach — SSE streams whose 200 status is committed
 * before the run executes, and the openai-compat error envelope. Without
 * this, classified provider outages (PROVIDER_UNAVAILABLE_*, 5xx) on
 * send-message produce no AppSignal incident at all, leaving only the raw
 * transport error recorded by the undici instrumentation (AYC-653).
 *
 * 4xx ApplicationErrors and HttpExceptions are expected client outcomes and
 * stay unreported, matching the filter.
 */
export function reportUnexpectedError(exception: unknown): void {
  if (exception instanceof ApplicationError && exception.statusCode < 500) {
    return;
  }
  if (exception instanceof HttpException && exception.getStatus() < 500) {
    return;
  }

  const providerFailure = findProviderUnavailableError(exception);
  if (providerFailure) {
    reportProviderUnavailableMetric(providerFailure);
    setError(providerFailure);
    return;
  }

  // setError requires an Error-like value; wrap non-Error throwables so
  // they still reach AppSignal.
  const error =
    exception instanceof Error ? exception : new Error(String(exception));
  setError(error);
}
