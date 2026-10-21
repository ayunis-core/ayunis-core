import { ConfigService } from '@nestjs/config';
import type { FynnReconciliationLock } from 'src/integrations/fynn/application/ports/fynn-reconciliation-lock';
import type { ReconcileFynnSubscriptionsUseCase } from 'src/integrations/fynn/application/use-cases/reconcile-fynn-subscriptions/reconcile-fynn-subscriptions.use-case';
import { FynnReconciliationTask } from './fynn-reconciliation.task';

jest.mock('@appsignal/nodejs', () => ({
  checkIn: { cron: async (_name: string, work: () => Promise<void>) => work() },
}));
describe('scheduled Fynn reconciliation', () => {
  it('reports per-org failures instead of recording a successful monitor check-in', async () => {
    const reconcile = {
      execute: async () => ({
        processed: 1,
        changed: 1,
        failed: 1,
        skipped: 0,
      }),
    } as unknown as ReconcileFynnSubscriptionsUseCase;
    const lock = {
      runIfAvailable: async (work: () => Promise<void>) => {
        await work();
        return true;
      },
    } as FynnReconciliationLock;
    const task = new FynnReconciliationTask(
      new ConfigService({
        app: { isCloudHosted: true },
        features: { fynnManagedSubscriptionsEnabled: true },
      }),
      lock,
      reconcile,
    );
    const errors = jest.spyOn(task['logger'], 'error').mockImplementation();
    await task.handleReconciliation();
    expect(errors).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      expect.any(String),
    );
  });
  it('does not acquire a database lock or read Fynn when the feature is disabled', async () => {
    const lock = {
      runIfAvailable: async () => {
        throw new Error('unexpected lock');
      },
    } as FynnReconciliationLock;
    const reconcile = {
      execute: async () => {
        throw new Error('unexpected provider access');
      },
    } as unknown as ReconcileFynnSubscriptionsUseCase;
    const task = new FynnReconciliationTask(
      new ConfigService({
        features: { fynnManagedSubscriptionsEnabled: false },
      }),
      lock,
      reconcile,
    );
    await expect(task.handleReconciliation()).resolves.toBeUndefined();
  });
});
