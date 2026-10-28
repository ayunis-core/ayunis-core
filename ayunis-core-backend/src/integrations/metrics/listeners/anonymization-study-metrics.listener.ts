import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge } from 'prom-client';
import { AnonymizationStudyEvent } from 'src/common/anonymization/application/events/anonymization-study.event';
import { STUDY_METRICS } from 'src/integrations/metrics/anonymization-study.metrics';

@Injectable()
export class AnonymizationStudyMetricsListener {
  constructor(
    @InjectMetric(STUDY_METRICS.requests)
    private readonly requests: Counter<'result'>,
    @InjectMetric(STUDY_METRICS.duration)
    private readonly duration: Counter<'result'>,
    @InjectMetric(STUDY_METRICS.overhead) private readonly overhead: Counter,
    @InjectMetric(STUDY_METRICS.failures) private readonly failures: Counter,
    @InjectMetric(STUDY_METRICS.capacityDrops)
    private readonly capacityDrops: Counter,
    @InjectMetric(STUDY_METRICS.admissions)
    private readonly admissions: Counter,
    @InjectMetric(STUDY_METRICS.entries) private readonly entries: Gauge,
    @InjectMetric(STUDY_METRICS.bytes) private readonly bytes: Gauge,
  ) {}

  @OnEvent(AnonymizationStudyEvent.EVENT_NAME)
  record(event: AnonymizationStudyEvent): void {
    try {
      const sample = event.sample;
      this.entries.set(sample.entries);
      this.bytes.set(sample.estimatedBytes);
      if (sample.hit === undefined) return;
      const labels = { result: sample.hit ? 'hit' : 'miss' };
      this.requests.inc(labels);
      this.duration.inc(labels, sample.durationSeconds);
      this.overhead.inc(sample.instrumentationSeconds);
      if (sample.failed) this.failures.inc();
      if (sample.capacityDrop) this.capacityDrops.inc();
      if (sample.admitted) this.admissions.inc();
    } catch {
      // A metrics failure must not alter detection or emit request-linked logs.
    }
  }
}
