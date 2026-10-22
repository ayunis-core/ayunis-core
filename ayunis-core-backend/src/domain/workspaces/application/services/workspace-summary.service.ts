import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { WorkspaceSharingRepository } from 'src/domain/workspaces/application/ports/workspace-sharing.repository';
import type { WorkspaceAccess } from 'src/domain/workspaces/application/models/workspace-access';
import type { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/workspace-access-level';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspaceDirectoryService } from './workspace-directory.service';

export interface WorkspaceSummary {
  accessLevel: WorkspaceAccessLevel;
  memberCount: number;
}

export interface WorkspaceDetail extends WorkspaceSummary {
  workspace: Workspace;
}

@Injectable()
export class WorkspaceSummaryService {
  constructor(
    private readonly sharingRepository: WorkspaceSharingRepository,
    private readonly directoryService: WorkspaceDirectoryService,
    private readonly context: ContextService,
  ) {}

  async detail(access: WorkspaceAccess): Promise<WorkspaceDetail> {
    const summary = (await this.summarize([access.workspace])).get(
      access.workspace.id,
    );
    return {
      workspace: access.workspace,
      accessLevel: access.level,
      memberCount: summary?.memberCount ?? 1,
    };
  }

  async summarize(
    workspaces: Workspace[],
  ): Promise<Map<UUID, WorkspaceSummary>> {
    if (workspaces.length === 0) return new Map();
    const { userId } = getRequiredUserContext(this.context);
    const [sharings, directory] = await Promise.all([
      this.sharingRepository.loadMany(workspaces),
      this.directoryService.load(),
    ]);
    const myTeamIds = directory.teamsOf(userId);
    const everyone = directory.people.map(({ id }) => id);
    const summaries = new Map<UUID, WorkspaceSummary>();
    for (const [workspaceId, sharing] of sharings) {
      summaries.set(workspaceId, {
        accessLevel: sharing.levelOf(userId, myTeamIds) ?? 'use',
        memberCount: sharing.memberIds(directory, everyone).size,
      });
    }
    return summaries;
  }
}
