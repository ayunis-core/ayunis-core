import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import type {
  DirectoryPerson,
  OrgDirectory,
} from 'src/domain/workspaces/application/models/org-directory';
import { WorkspaceSharingRepository } from 'src/domain/workspaces/application/ports/workspace-sharing.repository';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { compareAccessLevels } from 'src/domain/workspaces/domain/workspace-access-level';
import type { WorkspaceSharing } from 'src/domain/workspaces/domain/workspace-sharing';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';

export type DepartureOutcome =
  | { type: 'handed-over'; successorId: UUID }
  | { type: 'stays-alone'; workspace: Workspace }
  | { type: 'not-owned' };

@Injectable()
export class WorkspaceOwnershipService {
  constructor(
    private readonly sharingRepository: WorkspaceSharingRepository,
    private readonly workspaces: WorkspacesRepository,
  ) {}

  candidatesOf(
    sharing: WorkspaceSharing,
    directory: OrgDirectory,
  ): DirectoryPerson[] {
    const everyone = directory.people.map(({ id }) => id);
    return [...sharing.memberIds(directory, everyone)]
      .filter((userId) => userId !== sharing.ownerId)
      .map((userId) => directory.person(userId))
      .filter((person): person is DirectoryPerson => person !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  successorOf(sharing: WorkspaceSharing, directory: OrgDirectory): UUID | null {
    const ranked = this.candidatesOf(sharing, directory).map(({ id }) => ({
      id,
      level: sharing.levelOf(id, directory.teamsOf(id)) ?? 'use',
      invited: this.isInvited(sharing, id, directory),
    }));
    ranked.sort(
      (a, b) =>
        compareAccessLevels(a.level, b.level) ||
        Number(b.invited) - Number(a.invited),
    );
    return ranked.at(0)?.id ?? null;
  }

  private isInvited(
    sharing: WorkspaceSharing,
    userId: UUID,
    directory: OrgDirectory,
  ): boolean {
    return (
      sharing.people.has(userId) ||
      sharing.teams.some((grant) =>
        sharing.includedMembersOf(grant, directory).includes(userId),
      )
    );
  }

  @Transactional()
  async transfer(
    sharing: WorkspaceSharing,
    userId: UUID,
    directory: OrgDirectory,
  ): Promise<void> {
    await this.workspaces.lockForUpdate(sharing.workspaceId);
    await this.applyTransfer(sharing, userId, directory);
  }

  @Transactional()
  async handOverFrom(
    workspaceId: UUID,
    departingUserId: UUID,
    directory: OrgDirectory,
  ): Promise<DepartureOutcome> {
    await this.workspaces.lockForUpdate(workspaceId);
    const workspace = await this.workspaces.findOne(workspaceId);
    if (workspace?.userId !== departingUserId) return { type: 'not-owned' };
    const sharings = await this.sharingRepository.loadMany([workspace]);
    const sharing = sharings.get(workspaceId);
    const successorId = sharing ? this.successorOf(sharing, directory) : null;
    if (!sharing || !successorId) return { type: 'stays-alone', workspace };
    await this.applyTransfer(sharing, successorId, directory);
    return { type: 'handed-over', successorId };
  }

  private async applyTransfer(
    sharing: WorkspaceSharing,
    userId: UUID,
    directory: OrgDirectory,
  ): Promise<void> {
    sharing.transferOwnershipTo(userId, directory);
    await this.workspaces.changeOwner(sharing.workspaceId, userId);
    await this.sharingRepository.save(sharing);
  }
}
