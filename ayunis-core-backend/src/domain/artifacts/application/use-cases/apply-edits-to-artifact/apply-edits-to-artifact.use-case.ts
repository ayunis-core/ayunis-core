import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { ApplyEditsToArtifactCommand } from './apply-edits-to-artifact.command';
import {
  ArtifactContentTooLargeError,
  ArtifactEditAmbiguousError,
  ArtifactEditNotFoundError,
  ArtifactNotFoundError,
  ARTIFACT_MAX_CONTENT_LENGTH,
} from '../../artifacts.errors';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UpdateArtifactUseCase } from '../update-artifact/update-artifact.use-case';
import { UpdateArtifactCommand } from '../update-artifact/update-artifact.command';

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

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
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
      throw new Error(
        `Current version ${artifact.currentVersionNumber} not found for artifact ${command.artifactId}`,
      );
    }

    let content = currentVersion.content;

    // Apply edits sequentially
    for (let i = 0; i < command.edits.length; i++) {
      const edit = command.edits[i];
      const { oldText, newText } = edit;

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
