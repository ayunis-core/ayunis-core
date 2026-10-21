import { AsyncLocalStorage } from 'node:async_hooks';

// Internal effects run inside the state transaction; their webhook is outboxed.
export const localBillingEventContext = new AsyncLocalStorage<boolean>();
