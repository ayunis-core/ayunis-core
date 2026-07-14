import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { ApplyEditsToArtifactCommand } from './apply-edits-to-artifact.command';
import {
  ArtifactContentTooLargeError,
  ArtifactEditAmbiguousError,
  ArtifactEditNotFoundError,
  ArtifactExpectedVersionMismatchError,
  ArtifactNotFoundError,
  ArtifactVersionNotFoundError,
  UnexpectedArtifactError,
  ARTIFACT_MAX_CONTENT_LENGTH,
} from '../../artifacts.errors';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UpdateArtifactUseCase } from '../update-artifact/update-artifact.use-case';
import { UpdateArtifactCommand } from '../update-artifact/update-artifact.command';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class ApplyEditsToArtifactUseCase {
  private readonly logger = new Logger(ApplyEditsToArtifactUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
    private readonly updateArtifactUseCase: UpdateArtifactUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(
    command: ApplyEditsToArtifactCommand,
  ): Promise<ArtifactVersion> {
    this.logger.log('Applying edits to artifact', {
      artifactId: command.artifactId,
      editCount: command.edits.length,
    });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    // Fetch artifact with versions to get current content
    const artifact = await this.artifactsRepository.findByIdWithVersions(
      command.artifactId,
      userId,
    );
    if (!artifact) {
      throw new ArtifactNotFoundError(command.artifactId);
    }

    if (
      command.expectedVersionNumber !== undefined &&
      command.expectedVersionNumber !== artifact.currentVersionNumber
    ) {
      throw new ArtifactExpectedVersionMismatchError(
        command.artifactId,
        command.expectedVersionNumber,
        artifact.currentVersionNumber,
      );
    }

    // Find current version content
    const currentVersion = artifact.versions.find(
      (v) => v.versionNumber === artifact.currentVersionNumber,
    );
    if (!currentVersion) {
      throw new ArtifactVersionNotFoundError(
        command.artifactId,
        artifact.currentVersionNumber,
      );
    }

    const content = this.applyEdits(currentVersion.content, command.edits);

    // Sanitize and save using UpdateArtifactUseCase
    const updateCommand = new UpdateArtifactCommand({
      artifactId: command.artifactId,
      content: content,
      authorType: command.authorType,
    });

    const result = await this.updateArtifactUseCase.execute(updateCommand);
    // Content is always provided here so result is always an ArtifactVersion
    return result as ArtifactVersion;
  }

  private applyEdits(
    originalContent: string,
    edits: ApplyEditsToArtifactCommand['edits'],
  ): string {
    let content = originalContent;

    for (let i = 0; i < edits.length; i++) {
      const { oldText, newText } = edits[i];

      if (oldText.length === 0) {
        throw new ArtifactEditNotFoundError(i + 1, oldText);
      }

      const occurrences = this.findOccurrences(content, oldText);

      if (occurrences.length === 0) {
        throw new ArtifactEditNotFoundError(i + 1, oldText);
      }
      if (occurrences.length > 1) {
        throw new ArtifactEditAmbiguousError(i + 1, oldText);
      }

      const index = occurrences[0];
      content =
        content.substring(0, index) +
        newText +
        content.substring(index + oldText.length);
    }

    if (content.length > ARTIFACT_MAX_CONTENT_LENGTH) {
      throw new ArtifactContentTooLargeError(
        content.length,
        ARTIFACT_MAX_CONTENT_LENGTH,
      );
    }

    return content;
  }

  private findOccurrences(content: string, searchText: string): number[] {
    const indices: number[] = [];
    let index = content.indexOf(searchText);

    while (index !== -1) {
      indices.push(index);
      index = content.indexOf(searchText, index + 1);
    }

    return indices;
  }
}
