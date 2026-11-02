import { AsyncLocalStorage } from 'node:async_hooks';

const deferredEvents = new AsyncLocalStorage<readonly WeakSet<object>[]>();

export function runWithDeferredWebhookDelivery<T>(
  events: readonly object[],
  operation: () => T,
): T {
  return deferredEvents.run(
    [...(deferredEvents.getStore() ?? []), new WeakSet(events)],
    operation,
  );
}
export function isWebhookDeliveryDeferred(event: object): boolean {
  return deferredEvents.getStore()?.some((batch) => batch.has(event)) ?? false;
}
