import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ActiveUser } from '../../domain/active-user.entity';
import { UserRole } from '../../../users/domain/value-objects/role.object';
import { SystemRole } from '../../../users/domain/value-objects/system-role.enum';
import { UserContextInterceptor } from './user-context.interceptor';
import type { ContextService } from 'src/common/context/services/context.service';
import type { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';

describe('UserContextInterceptor', () => {
  const configService = {
    get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
  } as unknown as ConfigService;

  const createExecutionContext = (
    user?: unknown,
    cookies?: Record<string, string>,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          cookies,
        }),
      }),
    }) as unknown as ExecutionContext;

  const createCallHandler = (): CallHandler => ({
    handle: jest.fn(() => of(null)),
  });

  it('sets user identifiers into the context store when an ActiveUser is present', async () => {
    const setMock = jest.fn();
    const contextService = { set: setMock } as unknown as ContextService;
    const interceptor = new UserContextInterceptor(
      contextService,
      configService,
    );
    const activeUser: ActiveUser = new ActiveUser({
      id: 'user-id' as UUID,
      email: 'super.admin@example.com',
      emailVerified: true,
      role: UserRole.ADMIN,
      systemRole: SystemRole.SUPER_ADMIN,
      orgId: 'org-id' as UUID,
      name: 'Super Admin',
    });
    const callHandler = createCallHandler();

    await lastValueFrom(
      interceptor.intercept(
        createExecutionContext(activeUser, { refresh_token: 'the-refresh' }),
        callHandler,
      ),
    );

    expect(setMock).toHaveBeenCalledWith('userId', activeUser.id);
    expect(setMock).toHaveBeenCalledWith('orgId', activeUser.orgId);
    expect(setMock).toHaveBeenCalledWith('role', activeUser.role);
    expect(setMock).toHaveBeenCalledWith('systemRole', activeUser.systemRole);
    expect(setMock).toHaveBeenCalledWith('refreshToken', 'the-refresh');
    expect(setMock).not.toHaveBeenCalledWith('apiKeyId', expect.anything());
    expect(callHandler.handle).toHaveBeenCalled();
  });

  it('sets apiKeyId and orgId only when the principal is an api-key shape', async () => {
    const setMock = jest.fn();
    const contextService = { set: setMock } as unknown as ContextService;
    const interceptor = new UserContextInterceptor(
      contextService,
      configService,
    );
    const apiKeyPrincipal = {
      apiKeyId: 'api-key-id' as UUID,
      orgId: 'org-id' as UUID,
    };
    const callHandler = createCallHandler();

    await lastValueFrom(
      interceptor.intercept(
        createExecutionContext(apiKeyPrincipal),
        callHandler,
      ),
    );

    expect(setMock).toHaveBeenCalledWith('apiKeyId', apiKeyPrincipal.apiKeyId);
    expect(setMock).toHaveBeenCalledWith('orgId', apiKeyPrincipal.orgId);
    expect(setMock).not.toHaveBeenCalledWith('userId', expect.anything());
    expect(setMock).not.toHaveBeenCalledWith('role', expect.anything());
    expect(setMock).not.toHaveBeenCalledWith('systemRole', expect.anything());
    expect(callHandler.handle).toHaveBeenCalled();
  });

  it('skips setting context when user is undefined', async () => {
    const setMock = jest.fn();
    const contextService = { set: setMock } as unknown as ContextService;
    const interceptor = new UserContextInterceptor(
      contextService,
      configService,
    );
    const callHandler = createCallHandler();

    await lastValueFrom(
      interceptor.intercept(createExecutionContext(), callHandler),
    );

    expect(setMock).not.toHaveBeenCalled();
    expect(callHandler.handle).toHaveBeenCalled();
  });
});
