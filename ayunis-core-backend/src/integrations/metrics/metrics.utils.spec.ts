import { Logger } from '@nestjs/common';
import { safeMetric } from './metrics.utils';

describe('safeMetric', () => {
  const logger = new Logger('TestLogger');

  beforeEach(() => {
    jest.spyOn(logger, 'warn').mockImplementation();
  });

  it('should execute the metric function', () => {
    const fn = jest.fn();
    safeMetric(logger, fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should swallow errors and log a warning', () => {
    const fn = jest.fn().mockImplementation(() => {
      throw new Error('metric boom');
    });
    expect(() => safeMetric(logger, fn)).not.toThrow();
    expect(logger.warn).toHaveBeenCalledWith('Metric recording failed', {
      error: expect.any(Error),
    });
  });
});
