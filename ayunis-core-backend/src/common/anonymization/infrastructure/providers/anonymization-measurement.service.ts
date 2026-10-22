import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { ConfigType } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { anonymizationMeasurementConfig } from 'src/config/anonymization-measurement.config';
import type { DetectionMeasurementContext } from 'src/common/anonymization/domain/detection-measurement-context';
import type { PiiDetection } from 'src/common/anonymization/domain/pii-detection';
import { AnonymizationStudyEvent } from 'src/common/anonymization/application/events/anonymization-study.event';
import type { AnonymizationStudySample } from 'src/common/anonymization/application/events/anonymization-study.event';
import {
  ANONYMIZATION_CHUNK_LENGTH,
  ANONYMIZATION_CHUNK_OVERLAP,
} from 'src/common/anonymization/application/anonymization.constants';

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 10_000;
const ENTRY_OVERHEAD_BYTES = 256;

interface Observation {
  key: string;
  hit: boolean;
  startedAt: number;
  preparationMs: number;
}

@Injectable()
export class AnonymizationMeasurementService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly entries = new Map<
    string,
    { expiresAt: number; bytes: number }
  >();
  private estimatedBytes = 0;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    @Inject(anonymizationMeasurementConfig.KEY)
    private readonly config: ConfigType<typeof anonymizationMeasurementConfig>,
    private readonly events: EventEmitter2,
  ) {}

  onModuleInit(): void {
    if (!this.enabled()) return;
    this.timer = setInterval(() => this.sweep(), 60_000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
    const hadEntries = this.entries.size > 0;
    this.entries.clear();
    this.estimatedBytes = 0;
    if (!hadEntries) return;
    try {
      this.report({
        hit: undefined,
        failed: false,
        durationSeconds: 0,
        instrumentationSeconds: 0,
        admitted: false,
        capacityDrop: false,
      });
    } catch {
      /* Cleanup must remain safe when metrics are unavailable. */
    }
  }

  start(
    text: string,
    entities: string[] | undefined,
    context?: DetectionMeasurementContext,
  ): Observation | undefined {
    try {
      if (!this.enabled()) {
        this.onModuleDestroy();
        return undefined;
      }
      if (!context?.orgId || context.source !== 'tool_result') return undefined;
      const startedAt = performance.now();
      this.prune(startedAt);
      const key = createHmac('sha256', this.config.key)
        .update(
          JSON.stringify([
            context.orgId,
            this.config.detectorVersion,
            entities ?? null,
            ANONYMIZATION_CHUNK_LENGTH,
            ANONYMIZATION_CHUNK_OVERLAP,
            text,
          ]),
        )
        .digest('hex');
      return {
        key,
        hit: this.entries.has(key),
        startedAt,
        preparationMs: performance.now() - startedAt,
      };
    } catch {
      return undefined;
    }
  }

  finish(
    observation: Observation | undefined,
    detections?: PiiDetection[],
  ): void {
    try {
      if (!this.enabled()) {
        this.onModuleDestroy();
        return;
      }
      if (!observation) return;
      const now = performance.now();
      const durationSeconds =
        (now - observation.startedAt - observation.preparationMs) / 1000;
      this.prune(now);
      const insertion = this.store(observation, detections, now);
      this.report({
        hit: observation.hit,
        failed: detections === undefined,
        durationSeconds,
        instrumentationSeconds:
          (observation.preparationMs + performance.now() - now) / 1000,
        ...insertion,
      });
    } catch {
      /* Study failures must never change fail-closed detection. */
    }
  }

  private store(
    observation: Observation,
    detections: PiiDetection[] | undefined,
    now: number,
  ) {
    if (observation.hit || !detections)
      return { admitted: false, capacityDrop: false };
    const existing = this.entries.get(observation.key);
    if (!existing && this.entries.size >= MAX_ENTRIES)
      return { admitted: false, capacityDrop: true };
    const bytes =
      Buffer.byteLength(
        JSON.stringify(
          detections.map(({ start, end, category, entityType, score }) => ({
            start,
            end,
            category,
            entityType,
            score,
          })),
        ),
      ) +
      64 +
      ENTRY_OVERHEAD_BYTES;
    this.estimatedBytes += bytes - (existing?.bytes ?? 0);
    this.entries.delete(observation.key);
    this.entries.set(observation.key, { expiresAt: now + TTL_MS, bytes });
    return { admitted: !existing, capacityDrop: false };
  }

  private prune(now: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt > now) return;
      this.estimatedBytes -= entry.bytes;
      this.entries.delete(key);
    }
  }

  private sweep(): void {
    try {
      if (!this.enabled()) this.onModuleDestroy();
      this.prune(performance.now());
      this.report({
        hit: undefined,
        failed: false,
        durationSeconds: 0,
        instrumentationSeconds: 0,
        admitted: false,
        capacityDrop: false,
      });
    } catch {
      /* Background cleanup must not produce request-correlated logs. */
    }
  }

  private report(
    sample: Omit<AnonymizationStudySample, 'entries' | 'estimatedBytes'>,
  ): void {
    this.events.emit(
      AnonymizationStudyEvent.EVENT_NAME,
      new AnonymizationStudyEvent({
        ...sample,
        entries: this.entries.size,
        estimatedBytes: this.estimatedBytes,
      }),
    );
  }

  private enabled(): boolean {
    return (
      this.config.key.length >= 32 &&
      this.config.detectorVersion.trim().length > 0 &&
      Date.parse(this.config.expiresAt) > Date.now()
    );
  }
}
