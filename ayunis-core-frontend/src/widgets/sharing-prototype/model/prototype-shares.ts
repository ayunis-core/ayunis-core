import {
  patchState,
  readState,
  transferKey,
  type PrototypeState,
} from './prototype-store';
import type { OwnedItem, Person, ResourceKind, TransferTarget } from './types';

function sameTarget(a: TransferTarget, b: TransferTarget): boolean {
  if (a.kind === 'org' || b.kind === 'org') return a.kind === b.kind;
  return a.teamId === b.teamId;
}

export function itemSharesOf(
  current: PrototypeState,
  resource: ResourceKind,
  itemId: string,
): TransferTarget[] {
  return current.shares[transferKey(resource, itemId)] ?? [];
}

export function isSharedWith(
  targets: TransferTarget[],
  target: TransferTarget,
): boolean {
  return targets.some((candidate) => sameTarget(candidate, target));
}

export function isSharedWithPerson(
  current: PrototypeState,
  item: OwnedItem,
  resource: ResourceKind,
  person: Person,
): boolean {
  if (current.iteration !== 1) return false;
  if (item.owner.kind !== 'user' || item.owner.userId === person.id) {
    return false;
  }
  return itemSharesOf(current, resource, item.id).some(
    (target) => target.kind === 'org' || person.teamIds.includes(target.teamId),
  );
}

export function setItemShared(
  resource: ResourceKind,
  itemId: string,
  target: TransferTarget,
  isShared: boolean,
) {
  const current = readState();
  const without = itemSharesOf(current, resource, itemId).filter(
    (candidate) => !sameTarget(candidate, target),
  );
  patchState({
    shares: {
      ...current.shares,
      [transferKey(resource, itemId)]: isShared
        ? [...without, target]
        : without,
    },
  });
}
