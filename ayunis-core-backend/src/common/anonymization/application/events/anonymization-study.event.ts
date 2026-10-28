export interface AnonymizationStudySample {
  hit: boolean | undefined;
  failed: boolean;
  durationSeconds: number;
  instrumentationSeconds: number;
  entries: number;
  estimatedBytes: number;
  admitted: boolean;
  capacityDrop: boolean;
}

export class AnonymizationStudyEvent {
  static readonly EVENT_NAME = 'anonymization.study';

  constructor(public readonly sample: AnonymizationStudySample) {}
}
