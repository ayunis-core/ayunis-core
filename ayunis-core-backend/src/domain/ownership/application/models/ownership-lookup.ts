import type { UUID } from 'crypto';
import type { CollectiveOwnerDescriptions } from 'src/domain/ownership/application/use-cases/describe-collective-owners/describe-collective-owners.use-case';
import type { CollectiveOwner } from './collective-owner';
import type { OwnedResourceKind } from './owned-resource-kind';
import type { OwnershipViewer } from './ownership-viewer';

export type LookupOwner = CollectiveOwner | { type: 'personal'; userId: UUID };

export interface ResourceViewerRights {
  canUse: boolean;
  canEdit: boolean;
}

export interface OwnerEditor {
  userId: string;
  name: string;
}

export interface OwnerDescription {
  teamName: string | null;
  audienceCount: number | null;
  teamEditors: OwnerEditor[];
  orgEditorsIncludeNonAdmins: boolean;
}

export class OwnershipLookup {
  constructor(
    private readonly kind: OwnedResourceKind,
    readonly viewer: OwnershipViewer,
    private readonly descriptions: CollectiveOwnerDescriptions,
  ) {}

  rightsFor(owner: LookupOwner): ResourceViewerRights {
    if (owner.type === 'personal') {
      const isOwner = owner.userId === this.viewer.userId;
      return {
        canUse: isOwner,
        canEdit: isOwner && this.viewer.canManageOwn(this.kind),
      };
    }
    return {
      canUse: this.viewer.canUse(owner),
      canEdit: this.viewer.canManage(this.kind, owner),
    };
  }

  describe(owner: CollectiveOwner): OwnerDescription {
    return owner.type === 'team'
      ? this.describeTeam(owner.teamId)
      : this.describeOrg();
  }

  private describeTeam(teamId: UUID): OwnerDescription {
    const team = this.descriptions.teams.get(teamId);
    return {
      teamName: team?.name ?? null,
      audienceCount: team?.memberCount ?? null,
      teamEditors: team?.editors ?? [],
      orgEditorsIncludeNonAdmins: false,
    };
  }

  private describeOrg(): OwnerDescription {
    const org = this.descriptions.org;
    return {
      teamName: null,
      audienceCount: org?.memberCount ?? null,
      teamEditors: [],
      orgEditorsIncludeNonAdmins: org?.editorsIncludeNonAdmins ?? false,
    };
  }
}
