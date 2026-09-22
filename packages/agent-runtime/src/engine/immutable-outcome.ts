import type { AgentRuntimeError } from '../contracts/errors';
import type {
  ModelCallOutcome,
  ModelCallOutcomeSnapshot,
  ModelTurnOutcome,
  ModelTurnOutcomeSnapshot,
  ReadonlySnapshot,
} from '../contracts/hook';
import type { Message } from '../contracts/message';

export const immutableModelCallOutcome = (
  outcome: ModelCallOutcome,
): ModelCallOutcomeSnapshot => {
  const { model, ...values } = outcome;
  const isolated = immutableSnapshot(values);
  return Object.freeze({ ...isolated, model });
};

export const immutableRuntimeError = (
  error: AgentRuntimeError,
): ReadonlySnapshot<AgentRuntimeError> => immutableSnapshot(error);

export const immutableMessagesSnapshot = (
  messages: readonly Message[],
): readonly ReadonlySnapshot<Message>[] => immutableSnapshot(messages);

export const immutableModelTurnOutcome = (
  outcome: ModelTurnOutcome,
): ModelTurnOutcomeSnapshot => {
  if ('call' in outcome) {
    const { call, ...values } = outcome;
    return immutableSnapshot({
      ...values,
      ...(call ? { call: immutableModelCallOutcome(call) } : {}),
    }) as ModelTurnOutcomeSnapshot;
  }
  return immutableSnapshot(outcome);
};

const immutableSnapshot = <T>(value: T): ReadonlySnapshot<T> => {
  const snapshot = cloneUnknown(value);
  deepFreeze(snapshot);
  return snapshot as ReadonlySnapshot<T>;
};

const cloneUnknown = <T>(value: T, seen = new WeakMap<object, object>()): T => {
  if (Array.isArray(value)) {
    const existing = seen.get(value);
    if (existing) return existing as T;
    const result: unknown[] = [];
    const items: readonly unknown[] = value;
    seen.set(value, result);
    for (const item of items) result.push(cloneUnknown(item, seen));
    return result as T;
  }
  if (value instanceof Error) return cloneError(value, seen) as T;
  if (!isObject(value)) return value;
  const existing = seen.get(value);
  if (existing) return existing as T;
  const result: Record<string, unknown> = {};
  seen.set(value, result);
  for (const [key, nested] of Object.entries(value)) {
    result[key] = cloneUnknown(nested, seen);
  }
  return result as T;
};

const cloneError = (error: Error, seen: WeakMap<object, object>): Error => {
  const existing = seen.get(error);
  if (existing instanceof Error) return existing;
  const result = new Error(error.message);
  Object.setPrototypeOf(result, Reflect.getPrototypeOf(error));
  seen.set(error, result);
  result.name = error.name;
  result.stack = error.stack;
  if ('cause' in error) {
    Object.defineProperty(result, 'cause', {
      configurable: true,
      value: cloneUnknown(error.cause, seen),
      writable: true,
    });
  }
  for (const [key, nested] of Object.entries(error)) {
    Object.defineProperty(result, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: cloneUnknown(nested, seen),
    });
  }
  return result;
};

const deepFreeze = (value: unknown, seen = new WeakSet<object>()): void => {
  if (!isObject(value) || seen.has(value) || Object.isFrozen(value)) return;
  seen.add(value);
  for (const nested of Object.values(value)) deepFreeze(nested, seen);
  if (value instanceof Error && 'cause' in value) {
    deepFreeze(value.cause, seen);
  }
  Object.freeze(value);
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
