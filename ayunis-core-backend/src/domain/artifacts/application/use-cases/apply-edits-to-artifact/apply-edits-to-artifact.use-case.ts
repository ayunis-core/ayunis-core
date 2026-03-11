import { Injectable, Logger } from '@nestjs/common';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { ApplyEditsToArtifactCommand } from './apply-edits-to-artifact.command';
import {
  ArtifactContentTooLargeError,
  ArtifactEditAmbiguousError,
  ArtifactEditNotFoundError,
  ArtifactNotFoundError,
  ArtifactVersionNotFoundError,
  UnexpectedArtifactError,
  ARTIFACT_MAX_CONTENT_LENGTH,
} from '../../artifacts.errors';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UpdateArtifactUseCase } from '../update-artifact/update-artifact.use-case';
import { UpdateArtifactCommand } from '../update-artifact/update-artifact.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class ApplyEditsToArtifactUseCase {
  private readonly logger = new Logger(ApplyEditsToArtifactUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
    private readonly updateArtifactUseCase: UpdateArtifactUseCase,
  ) {}

  async execute(
    command: ApplyEditsToArtifactCommand,
  ): Promise<ArtifactVersion> {
    this.logger.log('Applying edits to artifact', {
      artifactId: command.artifactId,
      editCount: command.edits.length,
    });

    try {
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

      let content = currentVersion.content;

      // Apply edits sequentially
      for (let i = 0; i < command.edits.length; i++) {
        const edit = command.edits[i];
        const { oldText, newText } = edit;

        // Guard against empty oldText which would cause infinite loop in findOccurrences
        if (oldText.length === 0) {
          throw new ArtifactEditNotFoundError(i + 1, oldText);
        }

        // Find occurrences of oldText
        const occurrences = this.findOccurrences(content, oldText);

        if (occurrences.length === 0) {
          throw new ArtifactEditNotFoundError(i + 1, oldText);
        }

        if (occurrences.length > 1) {
          throw new ArtifactEditAmbiguousError(i + 1, oldText);
        }

        // Apply the edit
        const index = occurrences[0];
        content =
          content.substring(0, index) +
          newText +
          content.substring(index + oldText.length);
      }

      // Check content length after edits
      if (content.length > ARTIFACT_MAX_CONTENT_LENGTH) {
        throw new ArtifactContentTooLargeError(
          content.length,
          ARTIFACT_MAX_CONTENT_LENGTH,
        );
      }

      // Sanitize and save using UpdateArtifactUseCase
      const updateCommand = new UpdateArtifactCommand({
        artifactId: command.artifactId,
        content: content,
        authorType: command.authorType,
      });

      return await this.updateArtifactUseCase.execute(updateCommand);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error('applyEditsToArtifactUnexpectedError', {
        artifactId: command.artifactId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnexpectedArtifactError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
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
