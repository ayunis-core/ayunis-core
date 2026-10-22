import {
  makeCounterProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';

export const STUDY_METRICS = {
  requests: 'ayunis_anonymization_study_requests_total',
  duration: 'ayunis_anonymization_study_detection_seconds_total',
  overhead: 'ayunis_anonymization_study_instrumentation_seconds_total',
  failures: 'ayunis_anonymization_study_failures_total',
  capacityDrops: 'ayunis_anonymization_study_capacity_drops_total',
  admissions: 'ayunis_anonymization_study_admissions_total',
  entries: 'ayunis_anonymization_study_entries',
  bytes: 'ayunis_anonymization_study_estimated_bytes',
} as const;

export const anonymizationStudyMetricProviders = [
  makeCounterProvider({
    name: STUDY_METRICS.requests,
    help: 'Completed tool-result detections by simulated cache result',
    labelNames: ['result'],
  }),
  makeCounterProvider({
    name: STUDY_METRICS.duration,
    help: 'Observed detection time by simulated cache result',
    labelNames: ['result'],
  }),
  makeCounterProvider({
    name: STUDY_METRICS.overhead,
    help: 'Local fingerprint and size calculation time',
  }),
  makeCounterProvider({
    name: STUDY_METRICS.failures,
    help: 'Failed detections observed by the optional study',
  }),
  makeCounterProvider({
    name: STUDY_METRICS.capacityDrops,
    help: 'Successful misses not admitted due to the study memory bound',
  }),
  makeCounterProvider({
    name: STUDY_METRICS.admissions,
    help: 'New fingerprint entries admitted within the study TTL',
  }),
  makeGaugeProvider({
    name: STUDY_METRICS.entries,
    help: 'Fingerprint entries currently retained in process memory',
  }),
  makeGaugeProvider({
    name: STUDY_METRICS.bytes,
    help: 'Estimated Redis payload, key and overhead bytes for retained entries',
  }),
];
