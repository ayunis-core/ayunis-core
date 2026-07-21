import { applyDevPortOffset } from './dev-port-offset';

describe('applyDevPortOffset', () => {
  it('does nothing when DEV_PORT_OFFSET is unset', () => {
    const env: NodeJS.ProcessEnv = { POSTGRES_PORT: '5432' };

    applyDevPortOffset(env);

    expect(env.POSTGRES_PORT).toBe('5432');
  });

  it('does nothing when DEV_PORT_OFFSET is zero', () => {
    const env: NodeJS.ProcessEnv = { DEV_PORT_OFFSET: '0', PORT: '3000' };

    applyDevPortOffset(env);

    expect(env.PORT).toBe('3000');
  });

  it('does nothing when DEV_PORT_OFFSET is not a number', () => {
    const env: NodeJS.ProcessEnv = { DEV_PORT_OFFSET: 'abc', PORT: '3000' };

    applyDevPortOffset(env);

    expect(env.PORT).toBe('3000');
  });

  it('offsets plain port variables', () => {
    const env: NodeJS.ProcessEnv = {
      DEV_PORT_OFFSET: '20',
      PORT: '3000',
      POSTGRES_PORT: '5432',
      MINIO_PORT: '9000',
      REDIS_PORT: '6379',
      SMTP_PORT: '1025',
    };

    applyDevPortOffset(env);

    expect(env.PORT).toBe('3020');
    expect(env.POSTGRES_PORT).toBe('5452');
    expect(env.MINIO_PORT).toBe('9020');
    expect(env.REDIS_PORT).toBe('6399');
    expect(env.SMTP_PORT).toBe('1045');
  });

  it('leaves a non-numeric port variable untouched', () => {
    const env: NodeJS.ProcessEnv = { DEV_PORT_OFFSET: '20', PORT: 'auto' };

    applyDevPortOffset(env);

    expect(env.PORT).toBe('auto');
  });

  it('offsets the port of localhost URLs', () => {
    const env: NodeJS.ProcessEnv = {
      DEV_PORT_OFFSET: '20',
      CODE_EXECUTION_SERVICE_URL: 'http://localhost:8080',
      ANONYMIZE_SERVICE_URL: 'http://localhost:8002',
      GOTENBERG_URL: 'http://localhost:3100',
      FRONTEND_BASEURL: 'http://localhost:3001',
    };

    applyDevPortOffset(env);

    expect(env.CODE_EXECUTION_SERVICE_URL).toBe('http://localhost:8100');
    expect(env.ANONYMIZE_SERVICE_URL).toBe('http://localhost:8022');
    expect(env.GOTENBERG_URL).toBe('http://localhost:3120');
    expect(env.FRONTEND_BASEURL).toBe('http://localhost:3021');
  });

  it('offsets the port of 127.0.0.1 URLs', () => {
    const env: NodeJS.ProcessEnv = {
      DEV_PORT_OFFSET: '10',
      GOTENBERG_URL: 'http://127.0.0.1:3100',
    };

    applyDevPortOffset(env);

    expect(env.GOTENBERG_URL).toBe('http://127.0.0.1:3110');
  });

  it('preserves a path suffix when offsetting a URL', () => {
    const env: NodeJS.ProcessEnv = {
      DEV_PORT_OFFSET: '20',
      FRONTEND_BASEURL: 'http://localhost:3001/app',
    };

    applyDevPortOffset(env);

    expect(env.FRONTEND_BASEURL).toBe('http://localhost:3021/app');
  });

  it('leaves non-local URLs untouched', () => {
    const env: NodeJS.ProcessEnv = {
      DEV_PORT_OFFSET: '20',
      CODE_EXECUTION_SERVICE_URL: 'https://code-exec.example.com:8080',
    };

    applyDevPortOffset(env);

    expect(env.CODE_EXECUTION_SERVICE_URL).toBe(
      'https://code-exec.example.com:8080',
    );
  });

  it('leaves local URLs without an explicit port untouched', () => {
    const env: NodeJS.ProcessEnv = {
      DEV_PORT_OFFSET: '20',
      FRONTEND_BASEURL: 'http://localhost',
    };

    applyDevPortOffset(env);

    expect(env.FRONTEND_BASEURL).toBe('http://localhost');
  });

  it('offsets every local URL in CORS_ALLOWED_ORIGINS', () => {
    const env: NodeJS.ProcessEnv = {
      DEV_PORT_OFFSET: '20',
      CORS_ALLOWED_ORIGINS: [
        'http://localhost:3001',
        'http://localhost:3000',
        'https://app.example.com',
      ].join(','),
    };

    applyDevPortOffset(env);

    expect(env.CORS_ALLOWED_ORIGINS).toBe(
      [
        'http://localhost:3021',
        'http://localhost:3020',
        'https://app.example.com',
      ].join(','),
    );
  });

  it('leaves variables outside the derivation lists untouched', () => {
    const env: NodeJS.ProcessEnv = {
      DEV_PORT_OFFSET: '20',
      MARKETPLACE_SERVICE_URL: 'http://localhost:3002',
      OPENAI_API_KEY: 'sk-test',
      MAILCATCHER_WEB_HOST_PORT: '1080',
    };

    applyDevPortOffset(env);

    expect(env.MARKETPLACE_SERVICE_URL).toBe('http://localhost:3002');
    expect(env.OPENAI_API_KEY).toBe('sk-test');
    expect(env.MAILCATCHER_WEB_HOST_PORT).toBe('1080');
  });
});
