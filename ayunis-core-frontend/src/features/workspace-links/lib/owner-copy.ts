import type {
  LinkOwnerDto,
  LinkPersonDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export interface CopyKey {
  key: string;
  values?: Record<string, string>;
}

export function ownerLabel(
  owner: LinkOwnerDto,
  viewerId: string | undefined,
): CopyKey {
  if (owner.type === 'team') {
    return { key: 'links.owner.team', values: { team: owner.name ?? '' } };
  }
  if (owner.type === 'org') return { key: 'links.owner.org' };
  return owner.id === viewerId
    ? { key: 'links.owner.you' }
    : { key: 'links.owner.person', values: { name: owner.name ?? '' } };
}

export function ownerLines(
  owner: LinkOwnerDto,
  linkedBy: LinkPersonDto | null,
  viewerId: string | undefined,
): CopyKey[] {
  return [belongsTo(owner, viewerId), ...linkedByLine(linkedBy, viewerId)];
}

function belongsTo(owner: LinkOwnerDto, viewerId: string | undefined): CopyKey {
  if (owner.type === 'team') {
    return { key: 'links.belongs.team', values: { team: owner.name ?? '' } };
  }
  if (owner.type === 'org') return { key: 'links.belongs.org' };
  return owner.id === viewerId
    ? { key: 'links.belongs.you' }
    : { key: 'links.belongs.person', values: { name: owner.name ?? '' } };
}

function linkedByLine(
  linkedBy: LinkPersonDto | null,
  viewerId: string | undefined,
): CopyKey[] {
  if (!linkedBy) return [];
  return linkedBy.id === viewerId
    ? [{ key: 'links.linkedBy.you' }]
    : [{ key: 'links.linkedBy.person', values: { name: linkedBy.name } }];
}
