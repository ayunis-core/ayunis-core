import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import type { OrgDirectory } from 'src/domain/workspaces/application/models/org-directory';
import { WorkspaceSharingRights } from 'src/domain/workspaces/application/models/workspace-sharing-rights';
import { WorkspaceSharingRepository } from 'src/domain/workspaces/application/ports/workspace-sharing.repository';
import type { WorkspaceSharing } from 'src/domain/workspaces/domain/workspace-sharing';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspaceAccessService } from './workspace-access.service';
import { WorkspaceDirectoryService } from './workspace-directory.service';
import { WorkspaceLinkCleanupService } from './workspace-link-cleanup.service';
import { WorkspaceSharingViewBuilder } from './workspace-sharing-view.builder';

export interface SharingContext {
  workspace: Workspace;
  sharing: WorkspaceSharing;
  directory: OrgDirectory;
  rights: WorkspaceSharingRights;
  builder: WorkspaceSharingViewBuilder;
}

@Injectable()
export class WorkspaceSharingContextService {
  constructor(
    private readonly access: WorkspaceAccessService,
    private readonly sharingRepository: WorkspaceSharingRepository,
    private readonly directoryService: WorkspaceDirectoryService,
    private readonly getViewer: GetOwnershipViewerUseCase,
    private readonly linkCleanup: WorkspaceLinkCleanupService,
  ) {}

  async load(workspaceId: UUID): Promise<SharingContext> {
    const { workspace, level } = await this.access.require(workspaceId, 'use');
    const [sharings, directory, viewer] = await Promise.all([
      this.sharingRepository.loadMany([workspace]),
      this.directoryService.load(),
      this.getViewer.execute(),
    ]);
    const sharing = sharings.get(workspace.id);
    if (!sharing) throw new Error(`Missing sharing for ${workspace.id}`);
    const rights = new WorkspaceSharingRights(viewer.userId, level, viewer);
    return {
      workspace,
      sharing,
      directory,
      rights,
      builder: new WorkspaceSharingViewBuilder(sharing, directory, rights),
    };
  }

  async save(context: SharingContext): Promise<{ unlinkedCount: number }> {
    await this.sharingRepository.save(context.sharing);
    const unlinkedCount =
      await this.linkCleanup.removeLinksOfPeopleWithoutAccess({
        workspaceIds: [context.workspace.id],
      });
    return { unlinkedCount };
  }
}
