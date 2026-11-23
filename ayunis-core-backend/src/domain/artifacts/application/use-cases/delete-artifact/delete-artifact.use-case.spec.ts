import { randomUUID, type UUID } from 'crypto';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ArtifactNotFoundError } from 'src/domain/artifacts/application/artifacts.errors';
import type { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import type { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import { DocumentArtifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactManageAccessService } from 'src/domain/artifacts/application/services/artifact-manage-access.service';
import type { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { DeleteArtifactCommand } from './delete-artifact.command';
import { DeleteArtifactUseCase } from './delete-artifact.use-case';

const orgId = randomUUID();
const workspaceId = randomUUID();
const creator = randomUUID();
const member = randomUUID();
const manager = randomUUID();

/**
 * The repository finds the artifact for whoever may see it (the owner, or the
 * workspace's members); in the workspace only the manager holds
 * manage_workspace.
 */
function setup(artifact: Artifact | null, caller: UUID) {
  const deleted: UUID[] = [];
  const repository = {
    findById: jest.fn().mockResolvedValue(artifact),
    delete: jest.fn((id: UUID) => {
      deleted.push(id);
      return Promise.resolve();
    }),
  } as unknown as ArtifactsRepository;
  const workspaceWriteAccess = {
    execute: jest.fn(() =>
      caller === manager
        ? Promise.resolve()
        : Promise.reject(new UnauthorizedAccessError()),
    ),
  } as unknown as AssertWorkspaceWriteAccessUseCase;
  const context = {
    get: jest.fn(getFromUserContext({ userId: caller, orgId })),
  } as unknown as ContextService;
  const useCase = new DeleteArtifactUseCase(
    repository,
    new ArtifactManageAccessService(workspaceWriteAccess),
    context,
  );
  const deleteAs = (id: UUID) =>
    useCase.execute(new DeleteArtifactCommand({ artifactId: id }));
  return { deleteAs, deleted };
}

function workspaceArtifact(creatorId: UUID | null) {
  return new DocumentArtifact({
    owner: { type: 'workspace', workspaceId },
    creatorId,
    title: 'Beschlussvorlage',
  });
}

describe('DeleteArtifactUseCase', () => {
  it('lets the owner delete their personal artifact', async () => {
    const artifact = new DocumentArtifact({
      owner: { type: 'personal', userId: creator },
      creatorId: creator,
      title: 'Notiz',
    });
    const { deleteAs, deleted } = setup(artifact, creator);

    await deleteAs(artifact.id);

    expect(deleted).toEqual([artifact.id]);
  });

  it('lets the creator delete their workspace artifact without manage_workspace', async () => {
    const artifact = workspaceArtifact(creator);
    const { deleteAs, deleted } = setup(artifact, creator);

    await deleteAs(artifact.id);

    expect(deleted).toEqual([artifact.id]);
  });

  it('rejects a member who neither created the workspace artifact nor may manage the workspace, and keeps it', async () => {
    const artifact = workspaceArtifact(creator);
    const { deleteAs, deleted } = setup(artifact, member);

    await expect(deleteAs(artifact.id)).rejects.toThrow(
      UnauthorizedAccessError,
    );
    expect(deleted).toEqual([]);
  });

  it('lets a member with manage_workspace delete a colleague’s workspace artifact', async () => {
    const artifact = workspaceArtifact(creator);
    const { deleteAs, deleted } = setup(artifact, manager);

    await deleteAs(artifact.id);

    expect(deleted).toEqual([artifact.id]);
  });

  it('leaves a workspace artifact whose creator was deleted to the managers', async () => {
    const artifact = workspaceArtifact(null);

    await expect(setup(artifact, member).deleteAs(artifact.id)).rejects.toThrow(
      UnauthorizedAccessError,
    );
    const asManager = setup(artifact, manager);
    await asManager.deleteAs(artifact.id);
    expect(asManager.deleted).toEqual([artifact.id]);
  });

  it('reports not found to callers who cannot see the artifact, and deletes nothing', async () => {
    const { deleteAs, deleted } = setup(null, member);
    const artifactId = randomUUID();

    await expect(deleteAs(artifactId)).rejects.toThrow(ArtifactNotFoundError);
    expect(deleted).toEqual([]);
  });
});
