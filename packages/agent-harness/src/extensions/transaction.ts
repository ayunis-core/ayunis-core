import type { ExtensionCleanup } from '@ayunis/agent-extensions';

import { CleanupStack } from './cleanup-stack';
import type { StateTransactionAccess, TransactionalState } from './state-cell';

interface ActiveTransaction {
  readonly staged: Map<TransactionalState, unknown>;
  readonly resources: CleanupStack;
}

export class ExtensionTransaction implements StateTransactionAccess {
  private active?: ActiveTransaction;

  constructor(private readonly ownedResources: CleanupStack) {}

  read<State>(cell: TransactionalState): Readonly<State> {
    if (this.active?.staged.has(cell)) {
      return this.active.staged.get(cell) as State;
    }
    return cell.readCommitted() as State;
  }

  stage(cell: TransactionalState, value: unknown): void {
    if (this.active) {
      this.active.staged.set(cell, value);
      return;
    }
    cell.commit(value);
  }

  own(cleanup: ExtensionCleanup): void {
    (this.active?.resources ?? this.ownedResources).add(cleanup);
  }

  get changedOwners(): ReadonlySet<string> {
    return new Set(
      [...(this.active?.staged.keys() ?? [])].map((cell) => cell.ownerName),
    );
  }

  async run<Result>(
    operation: () => Result | Promise<Result>,
    validate: () => void | Promise<void>,
  ): Promise<Result> {
    if (this.active) {
      return operation();
    }
    const transaction: ActiveTransaction = {
      staged: new Map(),
      resources: new CleanupStack(),
    };
    this.active = transaction;
    try {
      const result = await operation();
      await validate();
      this.commit(transaction);
      return result;
    } catch (error) {
      await rollback(transaction, error);
      throw error;
    } finally {
      this.active = undefined;
    }
  }

  private commit(transaction: ActiveTransaction): void {
    for (const [cell, value] of transaction.staged) {
      cell.commit(value);
    }
    this.ownedResources.absorb(transaction.resources);
  }
}

const rollback = async (
  transaction: ActiveTransaction,
  operationError: unknown,
): Promise<void> => {
  try {
    await transaction.resources.dispose();
  } catch (cleanupError) {
    throw new AggregateError(
      [operationError, cleanupError],
      'Extension transaction and rollback cleanup failed.',
    );
  }
};
