import { Logger } from '@nestjs/common';
import { safeMetric, getUserContextLabels } from './metrics.utils';
import type { ContextService } from 'src/common/context/services/context.service';

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

describe('getUserContextLabels', () => {
  it('should return user_id and org_id from context', () => {
    const contextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return 'user-123';
        if (key === 'orgId') return 'org-456';
        return undefined;
      }),
    } as unknown as ContextService;

    expect(getUserContextLabels(contextService)).toEqual({
      user_id: 'user-123',
      org_id: 'org-456',
    });
  });

  it('should fall back to unknown when context is unavailable', () => {
    const contextService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ContextService;

    expect(getUserContextLabels(contextService)).toEqual({
      user_id: 'unknown',
      org_id: 'unknown',
    });
  });
});
