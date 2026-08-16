import type { ExtensionState } from '@ayunis/agent-extensions';

export interface TransactionalState {
  readonly ownerName: string;
  readCommitted(): unknown;
  commit(value: unknown): void;
}

export interface StateTransactionAccess {
  read<State>(cell: TransactionalState): Readonly<State>;
  stage(cell: TransactionalState, value: unknown): void;
}

interface StateCellOptions {
  ownerName: string;
  transaction: StateTransactionAccess;
  isProjecting: () => boolean;
  isDisposed: () => boolean;
  markDirty: (ownerName: string) => void;
}

export class StateCell<State>
  implements ExtensionState<State>, TransactionalState
{
  readonly ownerName: string;
  private value: State;

  constructor(
    initial: State,
    private readonly options: StateCellOptions,
  ) {
    this.ownerName = options.ownerName;
    this.value = initial;
  }

  get current(): Readonly<State> {
    return this.options.transaction.read<State>(this);
  }

  update(updater: (current: Readonly<State>) => State): void {
    if (this.options.isDisposed()) {
      throw new Error(
        `Cannot update state for extension '${this.ownerName}' after disposal.`,
      );
    }
    if (this.options.isProjecting()) {
      throw new Error(
        `Cannot update state for extension '${this.ownerName}' during contribution projection.`,
      );
    }
    this.options.transaction.stage(this, updater(this.current));
  }

  readCommitted(): State {
    return this.value;
  }

  commit(value: unknown): void {
    this.value = value as State;
    this.options.markDirty(this.ownerName);
  }
}
