import type { UUID } from 'crypto';
import type { LookupOwner } from './ownership-lookup';

export interface NamedPerson {
  id: UUID;
  name: string;
}

export interface NamedOwner {
  type: LookupOwner['type'];
  id: UUID;
  name: string | null;
}

export class OwnerNames {
  constructor(
    private readonly users: Map<UUID, string>,
    private readonly teams: Map<UUID, string>,
  ) {}

  owner(owner: LookupOwner): NamedOwner {
    if (owner.type === 'personal') {
      return {
        type: 'personal',
        id: owner.userId,
        name: this.users.get(owner.userId) ?? null,
      };
    }
    if (owner.type === 'team') {
      return {
        type: 'team',
        id: owner.teamId,
        name: this.teams.get(owner.teamId) ?? null,
      };
    }
    return { type: 'org', id: owner.orgId, name: null };
  }

  person(userId: UUID | null): NamedPerson | null {
    if (!userId) return null;
    const name = this.users.get(userId);
    return name === undefined ? null : { id: userId, name };
  }
}
