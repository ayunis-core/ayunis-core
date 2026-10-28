import { MODULE_METADATA } from '@nestjs/common/constants';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { AssertWorkspaceExecutionAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-execution-access/assert-workspace-execution-access.use-case';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { WorkspacesModule } from 'src/domain/workspaces/workspaces.module';

jest.mock('src/domain/favorites/favorites.module', () => ({
  FavoritesModule: class FavoritesModule {},
}));
jest.mock('src/domain/knowledge-bases/knowledge-bases.module', () => ({
  KnowledgeBasesModule: class KnowledgeBasesModule {},
}));
jest.mock('src/domain/skills/skills.module', () => ({
  SkillsModule: class SkillsModule {},
}));
jest.mock('src/domain/sources/sources.module', () => ({
  SourcesModule: class SourcesModule {},
}));
jest.mock('src/domain/threads/threads.module', () => ({
  ThreadsModule: class ThreadsModule {},
}));

describe('workspace authorization boundary', () => {
  it('exports capability use cases without exposing its policy or repository', () => {
    const exports: unknown[] = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      WorkspacesModule,
    );
    expect(exports).toEqual(
      expect.arrayContaining([
        AssertWorkspaceReadAccessUseCase,
        AssertWorkspaceWriteAccessUseCase,
        AssertWorkspaceExecutionAccessUseCase,
      ]),
    );
    expect(exports).not.toContain(WorkspaceAccessService);
    expect(exports).not.toContain(WorkspacesRepository);
  });
});
