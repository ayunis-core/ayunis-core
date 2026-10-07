export abstract class CreditReconciliationLock {
  abstract runExclusive(callback: () => Promise<void>): Promise<boolean>;
}
