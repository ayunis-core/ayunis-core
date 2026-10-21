export abstract class FynnReconciliationLock {
  abstract runIfAvailable(work: () => Promise<void>): Promise<boolean>;
}
