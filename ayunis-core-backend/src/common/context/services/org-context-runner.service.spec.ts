import { AsyncLocalStorage } from 'async_hooks';
import type { UUID } from 'crypto';
import type { MyClsStore } from './context.service';
import { ContextService } from './context.service';
import { OrgContextRunner } from './org-context-runner.service';

describe('OrgContextRunner', () => {
  let contextService: ContextService;
  let runner: OrgContextRunner;

  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;

  beforeEach(() => {
    contextService = new ContextService(new AsyncLocalStorage<MyClsStore>());
    runner = new OrgContextRunner(contextService);
  });

  describe('runForOrg', () => {
    it('exposes the orgId to code running inside the callback', async () => {
      const seen = await runner.runForOrg(orgId, () =>
        Promise.resolve(contextService.get('orgId')),
      );

      expect(seen).toBe(orgId);
    });

    it('does not leak the orgId outside the callback', async () => {
      await runner.runForOrg(orgId, () => Promise.resolve());

      expect(contextService.get('orgId')).toBeUndefined();
    });

    it('isolates contexts of concurrent runs', async () => {
      const otherOrgId = '22222222-2222-2222-2222-222222222222' as UUID;

      const [first, second] = await Promise.all([
        runner.runForOrg(orgId, async () => {
          await new Promise((resolve) => setImmediate(resolve));
          return contextService.get('orgId');
        }),
        runner.runForOrg(otherOrgId, async () => {
          await new Promise((resolve) => setImmediate(resolve));
          return contextService.get('orgId');
        }),
      ]);

      expect(first).toBe(orgId);
      expect(second).toBe(otherOrgId);
    });
  });
});
