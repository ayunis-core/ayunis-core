import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ActiveUser } from '../../domain/active-user.entity';
import { UserRole } from '../../../users/domain/value-objects/role.object';
import { SystemRole } from '../../../users/domain/value-objects/system-role.enum';
import { UserContextInterceptor } from './user-context.interceptor';
import type { ContextService } from 'src/common/context/services/context.service';
import type { UUID } from 'crypto';

describe('UserContextInterceptor', () => {
  const createExecutionContext = (
    user?: Partial<ActiveUser>,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    }) as unknown as ExecutionContext;

  const createCallHandler = (): CallHandler => ({
    handle: jest.fn(() => of(null)),
  });

  it('sets user identifiers into the context store when user is present', async () => {
    const setMock = jest.fn();
    const contextService = { set: setMock } as unknown as ContextService;
    const interceptor = new UserContextInterceptor(contextService);
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
      interceptor.intercept(createExecutionContext(activeUser), callHandler),
    );

    expect(setMock).toHaveBeenCalledWith('userId', activeUser.id);
    expect(setMock).toHaveBeenCalledWith('orgId', activeUser.orgId);
    expect(setMock).toHaveBeenCalledWith('systemRole', activeUser.systemRole);
    expect(callHandler.handle).toHaveBeenCalled();
  });

  it('skips setting context when user is undefined', async () => {
    const setMock = jest.fn();
    const contextService = { set: setMock } as unknown as ContextService;
    const interceptor = new UserContextInterceptor(contextService);
    const callHandler = createCallHandler();

    await lastValueFrom(
      interceptor.intercept(createExecutionContext(undefined), callHandler),
    );

    expect(setMock).not.toHaveBeenCalled();
    expect(callHandler.handle).toHaveBeenCalled();
  });
});
