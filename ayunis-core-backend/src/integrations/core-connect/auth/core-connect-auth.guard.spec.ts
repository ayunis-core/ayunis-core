import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CoreConnectAuthGuard } from './core-connect-auth.guard';

const SERVICE_TOKEN = 'a'.repeat(64);

function context(authorization?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
    }),
  } as unknown as ExecutionContext;
}

describe('CoreConnectAuthGuard', () => {
  let config: ConfigService;
  let guard: CoreConnectAuthGuard;

  beforeEach(() => {
    config = new ConfigService({
      coreConnect: { serviceToken: SERVICE_TOKEN },
    });
    guard = new CoreConnectAuthGuard(config);
  });

  it('authenticates a service without user or organization context', () => {
    expect(guard.canActivate(context(`Bearer ${SERVICE_TOKEN}`))).toBe(true);
  });

  it.each([
    undefined,
    '',
    'Bearer',
    'Bearer ',
    'Basic credentials',
    'Bearer incorrect',
    `Bearer ${'b'.repeat(64)}`,
    `Bearer ${SERVICE_TOKEN} another-token`,
    `Bearer ${SERVICE_TOKEN},another-token`,
  ])('rejects missing, malformed or invalid credentials: %s', (header) => {
    expect(() => guard.canActivate(context(header))).toThrow(
      UnauthorizedException,
    );
  });

  it.each([undefined, '', '   '])(
    'fails closed when configuration is %s',
    (token) => {
      config.set('coreConnect.serviceToken', token);
      expect(() =>
        guard.canActivate(context(`Bearer ${SERVICE_TOKEN}`)),
      ).toThrow(UnauthorizedException);
    },
  );

  it('accepts the replacement token and rejects the previous token after rotation', () => {
    const replacement = 'b'.repeat(64);
    const rotatedGuard = new CoreConnectAuthGuard(
      new ConfigService({ coreConnect: { serviceToken: replacement } }),
    );
    expect(() =>
      rotatedGuard.canActivate(context(`Bearer ${SERVICE_TOKEN}`)),
    ).toThrow(UnauthorizedException);
    expect(rotatedGuard.canActivate(context(`Bearer ${replacement}`))).toBe(
      true,
    );
  });
});
