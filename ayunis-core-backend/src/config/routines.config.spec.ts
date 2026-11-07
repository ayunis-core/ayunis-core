import { routinesConfig } from './routines.config';

describe('routinesConfig', () => {
  const original = process.env;
  afterEach(() => {
    process.env = original;
  });

  it.each([undefined, '', '  '])(
    'uses the defaults for an unset or blank value (%p)',
    (value) => {
      process.env = {
        ...original,
        ROUTINES_WORKER_CONCURRENCY: value,
        ROUTINES_RUN_TIMEOUT_MINUTES: value,
      };
      if (value === undefined) {
        delete process.env.ROUTINES_WORKER_CONCURRENCY;
        delete process.env.ROUTINES_RUN_TIMEOUT_MINUTES;
      }
      expect(routinesConfig()).toEqual({
        workerConcurrency: 2,
        runTimeoutMinutes: 15,
      });
    },
  );

  it('reads configured values', () => {
    process.env = {
      ...original,
      ROUTINES_WORKER_CONCURRENCY: '4',
      ROUTINES_RUN_TIMEOUT_MINUTES: '30',
    };
    expect(routinesConfig()).toEqual({
      workerConcurrency: 4,
      runTimeoutMinutes: 30,
    });
  });
});
