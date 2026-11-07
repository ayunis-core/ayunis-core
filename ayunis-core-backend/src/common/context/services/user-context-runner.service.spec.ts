import { AsyncLocalStorage } from 'async_hooks';
import type { UUID } from 'crypto';
import { getUserContext } from 'src/common/context/required-context';
import { aUserContext } from 'src/common/context/testing/context.fixtures';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { MyClsStore } from './context.service';
import { ContextService } from './context.service';
import { UserContextRunner } from './user-context-runner.service';

describe('UserContextRunner', () => {
  let contextService: ContextService;
  let runner: UserContextRunner;

  beforeEach(() => {
    contextService = new ContextService(new AsyncLocalStorage<MyClsStore>());
    runner = new UserContextRunner(contextService);
  });

  it('exposes the complete user context to code running inside the callback', async () => {
    const user = aUserContext({ role: UserRole.ADMIN });

    const seen = await runner.runAsUser(user, () =>
      Promise.resolve(getUserContext(contextService)),
    );

    expect(seen).toEqual(user);
  });

  it('does not leak the user context outside the callback', async () => {
    await runner.runAsUser(aUserContext(), () => Promise.resolve());

    expect(getUserContext(contextService)).toBeUndefined();
  });

  it('isolates contexts of concurrent runs', async () => {
    const otherUserId = '33333333-3333-4333-8333-333333333333' as UUID;

    const [first, second] = await Promise.all([
      runner.runAsUser(aUserContext(), async () => {
        await new Promise((resolve) => setImmediate(resolve));
        return contextService.get('userId');
      }),
      runner.runAsUser(aUserContext({ userId: otherUserId }), async () => {
        await new Promise((resolve) => setImmediate(resolve));
        return contextService.get('userId');
      }),
    ]);

    expect(first).toBe(aUserContext().userId);
    expect(second).toBe(otherUserId);
  });
});
