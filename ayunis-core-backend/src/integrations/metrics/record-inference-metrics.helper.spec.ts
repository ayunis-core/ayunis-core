import { Logger } from '@nestjs/common';
import type { RecordInferenceMetricsOptions } from './record-inference-metrics.helper';
import { recordInferenceMetrics } from './record-inference-metrics.helper';

describe('recordInferenceMetrics', () => {
  const logger = new Logger('TestLogger');
  let histogram: { observe: jest.Mock };
  let errorCounter: { inc: jest.Mock };

  beforeEach(() => {
    histogram = { observe: jest.fn() };
    errorCounter = { inc: jest.fn() };
    jest.spyOn(logger, 'warn').mockImplementation();
  });

  function makeOpts(
    overrides?: Partial<RecordInferenceMetricsOptions>,
  ): RecordInferenceMetricsOptions {
    return {
      histogram: histogram as never,
      errorCounter: errorCounter as never,
      logger,
      model: 'gpt-4',
      provider: 'openai',
      streaming: 'false',
      ...overrides,
    };
  }

  it('should observe duration on the histogram', () => {
    recordInferenceMetrics(makeOpts(), 1500);
    expect(histogram.observe).toHaveBeenCalledWith(
      { model: 'gpt-4', provider: 'openai', streaming: 'false' },
      1.5,
    );
    expect(errorCounter.inc).not.toHaveBeenCalled();
  });

  it('should increment error counter when error is provided', () => {
    const error = Object.assign(new Error('timeout'), { status: 429 });
    recordInferenceMetrics(makeOpts(), 2000, error);
    expect(errorCounter.inc).toHaveBeenCalledWith({
      model: 'gpt-4',
      provider: 'openai',
      error_type: 'rate_limit',
      streaming: 'false',
    });
  });

  it('should pass streaming string label through', () => {
    recordInferenceMetrics(makeOpts({ streaming: 'true' }), 500);
    expect(histogram.observe).toHaveBeenCalledWith(
      expect.objectContaining({ streaming: 'true' }),
      0.5,
    );
  });

  it('should not throw when histogram.observe fails', () => {
    histogram.observe.mockImplementation(() => {
      throw new Error('prom broken');
    });
    expect(() => recordInferenceMetrics(makeOpts(), 100)).not.toThrow();
  });

  it('should not throw when error counter fails', () => {
    errorCounter.inc.mockImplementation(() => {
      throw new Error('prom broken');
    });
    expect(() =>
      recordInferenceMetrics(makeOpts(), 100, new Error('some error')),
    ).not.toThrow();
  });
});
