import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ActiveUser } from '../../domain/active-user.entity';
import { ActiveApiKey } from '../../domain/active-api-key.entity';
import type { ActivePrincipal } from '../../domain/active-principal.entity';
import { UserRole } from '../../../users/domain/value-objects/role.object';
import { SystemRole } from '../../../users/domain/value-objects/system-role.enum';
import { UserContextInterceptor } from './user-context.interceptor';
import type { ContextService } from 'src/common/context/services/context.service';
import type { UUID } from 'crypto';

describe('UserContextInterceptor', () => {
  const createExecutionContext = (params: {
    user?: ActivePrincipal;
  }): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => params,
      }),
    }) as unknown as ExecutionContext;

  const createCallHandler = (): CallHandler => ({
    handle: jest.fn(() => of(null)),
  });

  it('sets user-principal identifiers when an ActiveUser is present', async () => {
    const setMock = jest.fn();
    const contextService = { set: setMock } as unknown as ContextService;
    const interceptor = new UserContextInterceptor(contextService);
    const activeUser = new ActiveUser({
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
        createExecutionContext({ user: activeUser }),
        callHandler,
      ),
    );

    expect(setMock).toHaveBeenCalledWith('principalKind', 'user');
    expect(setMock).toHaveBeenCalledWith('userId', activeUser.id);
    expect(setMock).toHaveBeenCalledWith('orgId', activeUser.orgId);
    expect(setMock).toHaveBeenCalledWith('systemRole', activeUser.systemRole);
    expect(setMock).not.toHaveBeenCalledWith('apiKeyId', expect.anything());
    expect(callHandler.handle).toHaveBeenCalled();
  });

  it('sets api-key-principal identifiers when an ActiveApiKey is present', async () => {
    const setMock = jest.fn();
    const contextService = { set: setMock } as unknown as ContextService;
    const interceptor = new UserContextInterceptor(contextService);
    const activeApiKey = new ActiveApiKey({
      apiKeyId: 'key-id' as UUID,
      label: 'ci-bot',
      orgId: 'org-id' as UUID,
    });
    const callHandler = createCallHandler();

    await lastValueFrom(
      interceptor.intercept(
        createExecutionContext({ user: activeApiKey }),
        callHandler,
      ),
    );

    expect(setMock).toHaveBeenCalledWith('principalKind', 'apiKey');
    expect(setMock).toHaveBeenCalledWith('apiKeyId', activeApiKey.apiKeyId);
    expect(setMock).toHaveBeenCalledWith('orgId', activeApiKey.orgId);
    expect(setMock).not.toHaveBeenCalledWith('userId', expect.anything());
    expect(setMock).not.toHaveBeenCalledWith('role', expect.anything());
    expect(setMock).not.toHaveBeenCalledWith('systemRole', expect.anything());
    expect(callHandler.handle).toHaveBeenCalled();
  });

  it('skips setting context when no principal is present', async () => {
    const setMock = jest.fn();
    const contextService = { set: setMock } as unknown as ContextService;
    const interceptor = new UserContextInterceptor(contextService);
    const callHandler = createCallHandler();

    await lastValueFrom(
      interceptor.intercept(createExecutionContext({}), callHandler),
    );

    expect(setMock).not.toHaveBeenCalled();
    expect(callHandler.handle).toHaveBeenCalled();
  });
});
