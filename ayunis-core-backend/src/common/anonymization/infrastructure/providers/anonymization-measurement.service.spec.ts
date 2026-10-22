import { EventEmitter2 } from '@nestjs/event-emitter';
import { AnonymizationMeasurementService } from './anonymization-measurement.service';
import type { AnonymizationStudySample } from 'src/common/anonymization/application/events/anonymization-study.event';
import { AnonymizationStudyEvent } from 'src/common/anonymization/application/events/anonymization-study.event';

const config = {
  key: 'measurement-only-secret-32-characters',
  detectorVersion: 'presidio-v2.59.0',
  expiresAt: '2099-01-01T00:00:00Z',
};
const context = { orgId: 'municipality-a', source: 'tool_result' as const };

describe('aggregate anonymization study', () => {
  const events = new EventEmitter2();
  let samples: AnonymizationStudySample[];
  let service: AnonymizationMeasurementService;
  beforeEach(() => {
    samples = [];
    events.removeAllListeners();
    events.on(
      AnonymizationStudyEvent.EVENT_NAME,
      (event: AnonymizationStudyEvent) => samples.push(event.sample),
    );
    service = new AnonymizationMeasurementService(config, events);
  });
  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
  });

  function detect(text = 'Maria Schmidt', orgId = context.orgId) {
    const observation = service.start(text, undefined, { ...context, orgId });
    service.finish(observation, []);
  }

  it('reports repeat totals without exporting identity, fingerprints, timestamps or input', () => {
    detect();
    detect();
    expect(
      samples
        .filter((event) => event.hit !== undefined)
        .map((event) => event.hit),
    ).toEqual([false, true]);
    const exported = JSON.stringify(samples);
    for (const sensitive of [
      'Maria',
      'municipality-a',
      config.key,
      'fingerprint',
      'tenant',
      'startedAt',
      'trace',
      'orgId',
      'userId',
    ])
      expect(exported).not.toContain(sensitive);
    expect(new Set(Object.keys(samples[0]))).toEqual(
      new Set([
        'admitted',
        'capacityDrop',
        'durationSeconds',
        'entries',
        'estimatedBytes',
        'failed',
        'hit',
        'instrumentationSeconds',
      ]),
    );
  });

  it('keeps tenant and detection configuration boundaries inside the server', () => {
    detect();
    detect('Maria Schmidt', 'municipality-b');
    const observation = service.start('Maria Schmidt', ['PERSON'], context);
    service.finish(observation, []);
    expect(
      samples
        .filter((event) => event.hit !== undefined)
        .map((event) => event.hit),
    ).toEqual([false, false, false]);
  });

  it('separates different text, detector versions and study keys in the same process', () => {
    const options = { ...config };
    service = new AnonymizationMeasurementService(options, events);
    detect();
    detect('Maria Schmidt!');
    options.detectorVersion = 'next-model';
    detect();
    options.key = 'another-dedicated-measurement-key-32-characters';
    detect();
    expect(samples.map((event) => event.hit)).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  it.each([
    { ...config, key: 'short' },
    { ...config, expiresAt: 'invalid' },
    { ...config, detectorVersion: '' },
  ])(
    'ignores invalid configuration without collecting a request: %j',
    (options) => {
      service = new AnonymizationMeasurementService(options, events);
      detect();
      expect(samples).toHaveLength(0);
    },
  );

  it('counts concurrent starts as misses and never stores failed detections', () => {
    const first = service.start('Maria Schmidt', undefined, context);
    const second = service.start('Maria Schmidt', undefined, context);
    service.finish(first);
    service.finish(second, []);
    detect();
    expect(
      samples
        .filter((event) => event.hit !== undefined)
        .map((event) => event.hit),
    ).toEqual([false, false, true]);
    expect(samples[0].failed).toBe(true);
  });

  it('expires fingerprints without sliding the lifetime on a hit', () => {
    jest.useFakeTimers();
    service.onModuleInit();
    detect();
    jest.advanceTimersByTime(23 * 3_600_000);
    detect();
    jest.advanceTimersByTime(3_600_000);
    detect();
    expect(
      samples
        .filter((event) => event.hit !== undefined)
        .map((event) => event.hit),
    ).toEqual([false, true, false]);
  });

  it('bounds memory and exposes coverage loss when the fingerprint capacity is reached', () => {
    for (let index = 0; index < 10_001; index++) detect(`Document ${index}`);
    expect(samples.at(-1)).toMatchObject({
      entries: 10_000,
      capacityDrop: true,
      admitted: false,
    });
  });

  it('skips user messages, missing context and disabled configuration', () => {
    expect(
      service.start('Maria', undefined, { ...context, source: 'user_message' }),
    ).toBeUndefined();
    expect(service.start('Maria', undefined)).toBeUndefined();
    service = new AnonymizationMeasurementService(
      { ...config, key: '' },
      events,
    );
    detect();
    expect(samples).toHaveLength(0);
  });

  it('clears memory at the study deadline and shutdown', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-22T00:00:00Z'));
    service = new AnonymizationMeasurementService(
      { ...config, expiresAt: '2026-10-22T00:01:00Z' },
      events,
    );
    service.onModuleInit();
    detect();
    jest.advanceTimersByTime(60_000);
    expect(samples.at(-1)).toMatchObject({ entries: 0, estimatedBytes: 0 });
    const count = samples.length;
    detect();
    expect(samples).toHaveLength(count);
  });

  it('does not let a reporting failure escape into detection', () => {
    events.on(AnonymizationStudyEvent.EVENT_NAME, () => {
      throw new Error('metrics unavailable');
    });
    expect(() => detect()).not.toThrow();
  });
});
