import type { UUID } from 'crypto';
import type { Response } from 'express';
import type { CreateArtifactUseCase } from 'src/domain/artifacts/application/use-cases/create-artifact/create-artifact.use-case';
import type { UpdateArtifactUseCase } from 'src/domain/artifacts/application/use-cases/update-artifact/update-artifact.use-case';
import type { CreateArtifactCommand } from 'src/domain/artifacts/application/use-cases/create-artifact/create-artifact.command';
import type { UpdateArtifactCommand } from 'src/domain/artifacts/application/use-cases/update-artifact/update-artifact.command';
import type { FindArtifactsByThreadUseCase } from 'src/domain/artifacts/application/use-cases/find-artifacts-by-thread/find-artifacts-by-thread.use-case';
import type { FindArtifactsByWorkspaceUseCase } from 'src/domain/artifacts/application/use-cases/find-artifacts-by-workspace/find-artifacts-by-workspace.use-case';
import type { FindArtifactWithVersionsUseCase } from 'src/domain/artifacts/application/use-cases/find-artifact-with-versions/find-artifact-with-versions.use-case';
import type { RevertArtifactUseCase } from 'src/domain/artifacts/application/use-cases/revert-artifact/revert-artifact.use-case';
import type { ExportArtifactUseCase } from 'src/domain/artifacts/application/use-cases/export-artifact/export-artifact.use-case';
import type { CreateArtifactDto } from 'src/domain/artifacts/presenters/http/dtos/create-artifact.dto';
import type { UpdateArtifactDto } from 'src/domain/artifacts/presenters/http/dtos/update-artifact.dto';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { ArtifactsController } from './artifacts.controller';

const THREAD_ID = '3f6c1a2e-8b4d-4e7a-9c5f-1d2e3a4b5c6d' as UUID;
const ARTIFACT_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d' as UUID;

function setup() {
  const createArtifactUseCase = { execute: jest.fn().mockResolvedValue({}) };
  const updateArtifactUseCase = { execute: jest.fn().mockResolvedValue({}) };
  const controller = new ArtifactsController(
    createArtifactUseCase as unknown as CreateArtifactUseCase,
    updateArtifactUseCase as unknown as UpdateArtifactUseCase,
    {} as FindArtifactsByThreadUseCase,
    {} as FindArtifactsByWorkspaceUseCase,
    {} as FindArtifactWithVersionsUseCase,
    {} as RevertArtifactUseCase,
    {} as ExportArtifactUseCase,
    {
      toDto: jest.fn(),
      toVersionDto: jest.fn(),
    },
  );
  return { controller, createArtifactUseCase, updateArtifactUseCase };
}

describe(ArtifactsController.name, () => {
  it('records a created artifact as user-authored even if the client claims the assistant wrote it, so it is masked', async () => {
    const { controller, createArtifactUseCase } = setup();

    await controller.create({
      title: 'Bürgeranfrage',
      content: '<p>Max Mustermann, max@example.org</p>',
      threadId: THREAD_ID,
      authorType: AuthorType.ASSISTANT,
    } as CreateArtifactDto);

    const command = createArtifactUseCase.execute.mock
      .calls[0][0] as CreateArtifactCommand;
    expect(command.authorType).toBe(AuthorType.USER);
  });

  it('records an edited version as user-authored even if the client claims the assistant wrote it, so it is masked', async () => {
    const { controller, updateArtifactUseCase } = setup();

    await controller.update(
      ARTIFACT_ID,
      {
        content: '<p>Max Mustermann, max@example.org</p>',
        authorType: AuthorType.ASSISTANT,
      } as UpdateArtifactDto,
      { status: jest.fn() } as unknown as Response,
    );

    const command = updateArtifactUseCase.execute.mock
      .calls[0][0] as UpdateArtifactCommand;
    expect(command.authorType).toBe(AuthorType.USER);
  });
});
