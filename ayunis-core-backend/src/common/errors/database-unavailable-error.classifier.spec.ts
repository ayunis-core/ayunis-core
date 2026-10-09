import { isDatabaseUnavailableError } from './database-unavailable-error.classifier';

describe(isDatabaseUnavailableError.name, () => {
  it.each(['57P01', '57P02', '57P03', '08001', '08006'])(
    'recognizes PostgreSQL availability code %s',
    (code) => {
      expect(
        isDatabaseUnavailableError(Object.assign(new Error(), { code })),
      ).toBe(true);
    },
  );

  it('walks TypeORM driver errors', () => {
    const error = {
      driverError: Object.assign(new Error('connect ECONNREFUSED'), {
        code: 'ECONNREFUSED',
      }),
    };

    expect(isDatabaseUnavailableError(error)).toBe(true);
  });

  it('walks aggregate connection failures', () => {
    const error = new AggregateError([
      Object.assign(new Error('connect ECONNREFUSED ::1:5432'), {
        code: 'ECONNREFUSED',
      }),
      Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), {
        code: 'ECONNREFUSED',
      }),
    ]);

    expect(isDatabaseUnavailableError(error)).toBe(true);
  });

  it('does not classify database bugs or message-only guesses as outages', () => {
    expect(
      isDatabaseUnavailableError(
        Object.assign(new Error('duplicate key'), { code: '23505' }),
      ),
    ).toBe(false);
    expect(isDatabaseUnavailableError(new Error('database unavailable'))).toBe(
      false,
    );
  });
});
