import type { typeormConfigRaw } from './typeorm.config';

const original = process.env;
afterEach(() => {
  process.env = original;
});

function timeoutFor(values: NodeJS.ProcessEnv): unknown {
  process.env = { ...original, ...values };
  delete process.env.POSTGRES_CONNECTION_TIMEOUT_MS;
  if (values.POSTGRES_CONNECTION_TIMEOUT_MS !== undefined) {
    process.env.POSTGRES_CONNECTION_TIMEOUT_MS =
      values.POSTGRES_CONNECTION_TIMEOUT_MS;
  }
  let timeout: unknown;
  jest.isolateModules(() => {
    const config = jest.requireActual<{
      typeormConfigRaw: typeof typeormConfigRaw;
    }>('./typeorm.config');
    const options = config.typeormConfigRaw as {
      extra: { connectionTimeoutMillis?: number };
    };
    timeout = options.extra.connectionTimeoutMillis;
  });
  return timeout;
}

it.each([
  ['development', 'cloud', 'false'],
  ['production', 'cloud', 'true'],
  ['test', 'self-hosted', 'false'],
  ['production', 'self-hosted', 'true'],
])(
  'defaults to ten seconds for %s/%s with subscription flag %s',
  (node, app, flag) => {
    expect(
      timeoutFor({
        NODE_ENV: node,
        APP_ENVIRONMENT: app,
        FEATURE_EXTERNAL_SUBSCRIPTIONS_ENABLED: flag,
      }),
    ).toBe(10_000);
  },
);
it.each([
  [undefined, 10_000],
  ['', 10_000],
  ['   ', 10_000],
  ['2500', 2500],
  ['0', 0],
])('resolves connection timeout %p to %p', (value, expected) => {
  expect(timeoutFor({ POSTGRES_CONNECTION_TIMEOUT_MS: value })).toBe(expected);
});
