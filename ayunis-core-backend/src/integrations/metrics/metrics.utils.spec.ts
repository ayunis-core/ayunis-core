import { createLoggerMock } from 'src/common/testing/logger.mock';
import { safeMetric } from './metrics.utils';

describe('safeMetric', () => {
  const logger = createLoggerMock();

  beforeEach(() => {
    logger.warn.mockReset();
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
    expect(logger.warn).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      'Metric recording failed',
    );
  });
});
