import type { Queue } from 'bullmq';
import { oldestWaitingTimestamp } from './oldest-waiting-timestamp';

interface GaugeReporter {
  setGauge(name: string, value: number, tags: { queue: string }): unknown;
}

const STATES = ['waiting', 'active', 'delayed', 'completed', 'failed'] as const;

export async function sampleQueueHealth(
  queue: Queue,
  metrics: GaugeReporter,
  now = Date.now(),
): Promise<void> {
  const [counts, workers] = await Promise.all([
    queue.getJobCounts(...STATES, 'paused'),
    queue.getWorkersCount(),
  ]);
  counts.waiting += counts.paused || 0;
  const oldest =
    counts.waiting === 0 ? undefined : await oldestWaitingTimestamp(queue);
  const tags = { queue: queue.name };
  for (const state of STATES) {
    metrics.setGauge(`bullmq_jobs_${state}`, counts[state] ?? 0, tags);
  }
  metrics.setGauge('bullmq_workers_registered', workers, tags);
  metrics.setGauge(
    'bullmq_oldest_waiting_age_seconds',
    oldest === undefined ? 0 : Math.max(0, now - oldest) / 1000,
    tags,
  );
}
