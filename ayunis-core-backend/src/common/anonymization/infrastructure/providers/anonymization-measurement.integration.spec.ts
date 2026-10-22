import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  anonymizationStudyMetricProviders,
  STUDY_METRICS,
} from 'src/integrations/metrics/anonymization-study.metrics';
import { AnonymizationStudyMetricsListener } from 'src/integrations/metrics/listeners/anonymization-study-metrics.listener';
import { register } from 'prom-client';
import { getToken } from '@willsoto/nestjs-prometheus';
import type { Counter } from 'prom-client';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { createLoggerMock } from 'src/common/testing/logger.mock';
import { AnonymizationModule } from 'src/common/anonymization/anonymization.module';
import { AnonymizeTextUseCase } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.use-case';
import { AnonymizeTextCommand } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.command';
import { anonymizationMeasurementConfig } from 'src/config/anonymization-measurement.config';

const analyze = jest.fn();
jest.mock(
  'src/common/clients/anonymize/generated/mSPresidioPIIDetectionAPI',
  () => ({
    getMSPresidioPIIDetectionAPI: () => ({ analyzeTextAnalyzePost: analyze }),
  }),
);

const config = {
  key: 'dedicated-measurement-key-32-characters',
  detectorVersion: 'presidio-v2.59.0',
  expiresAt: '2099-01-01T00:00:00Z',
};
const context = {
  orgId: 'municipality-a',
  source: 'tool_result' as const,
  toolType: 'source_query',
};

describe('measurement through the anonymization module', () => {
  const logger = createLoggerMock();
  beforeEach(() => {
    jest.clearAllMocks();
    register.clear();
    analyze.mockResolvedValue({
      results: [{ start: 2, end: 7, entity_type: 'PERSON', score: 0.9 }],
    });
  });

  async function withUseCase(
    run: (
      useCase: AnonymizeTextUseCase,
      module: TestingModule,
    ) => Promise<void>,
    studyConfig = config,
  ) {
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot(), AnonymizationModule],
      providers: [
        ...anonymizationStudyMetricProviders,
        AnonymizationStudyMetricsListener,
      ],
    })
      .overrideProvider(anonymizationMeasurementConfig.KEY)
      .useValue(studyConfig)
      .compile();
    await module.init();
    try {
      await run(module.get(AnonymizeTextUseCase), module);
    } finally {
      await module.close();
    }
  }

  it('preserves Unicode masking and still detects every repeat while emitting measurements', async () => {
    await withUseCase(async (useCase) => {
      const command = new AnonymizeTextCommand(
        '📎 Maria',
        undefined,
        [],
        [],
        context,
      );
      const first = await useCase.execute(command);
      const second = await useCase.execute(command);
      expect(first.anonymizedText).toBe('📎 {{pii:PERSON_NAME_1}}');
      expect(second).toEqual(first);
      expect(analyze).toHaveBeenCalledTimes(2);
      const output = await register.metrics();
      expect(output).toContain(STUDY_METRICS.requests);
      const studyLines = output
        .split('\n')
        .filter((line) => line.startsWith('ayunis_anonymization_study_'));
      expect(studyLines.some((line) => line.includes('result="hit"'))).toBe(
        true,
      );
      expect(JSON.stringify(studyLines)).not.toMatch(
        /municipality|Maria|fingerprint|tenant|user.id|org.id|trace_id|startedAt/,
      );
    });
  });

  it('preserves masking when aggregate recording fails without logging study data', async () => {
    await withUseCase(async (useCase, module) => {
      const counter = module.get<Counter>(getToken(STUDY_METRICS.requests));
      jest.spyOn(counter, 'inc').mockImplementationOnce(() => {
        throw new Error('metrics unavailable');
      });
      const result = await useCase.execute(
        new AnonymizeTextCommand('📎 Maria', undefined, [], [], context),
      );
      expect(result.anonymizedText).toBe('📎 {{pii:PERSON_NAME_1}}');
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  it('keeps the real module disabled without a study key while preserving masking', async () => {
    await withUseCase(
      async (useCase) => {
        const result = await useCase.execute(
          new AnonymizeTextCommand('📎 Maria', undefined, [], [], context),
        );
        expect(result.anonymizedText).toBe('📎 {{pii:PERSON_NAME_1}}');
        const metric = await register
          .getSingleMetric(STUDY_METRICS.requests)!
          .get();
        expect(metric.values).toHaveLength(0);
      },
      { ...config, key: '' },
    );
  });

  it('remains fail-closed when detection fails with measurement enabled', async () => {
    analyze.mockRejectedValue(new Error('detector unavailable'));
    await withUseCase(async (useCase) => {
      await expect(
        useCase.execute(
          new AnonymizeTextCommand('📎 Maria', undefined, [], [], context),
        ),
      ).rejects.toThrow();
      expect(
        logger.log.mock.calls.some(
          (args: unknown[]) => args[1] === 'PII cache measurement',
        ),
      ).toBe(false);
    });
  });
});
