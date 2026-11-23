import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import {
  ApplyEditsToArtifactCommand,
  type ArtifactEdit,
} from './apply-edits-to-artifact.command';
import {
  ArtifactContentTooLargeError,
  ArtifactEditAmbiguousError,
  ArtifactEditNotFoundError,
  ArtifactExpectedVersionMismatchError,
  ArtifactNotFoundError,
  ArtifactVersionNotFoundError,
  UnexpectedArtifactError,
  ARTIFACT_MAX_CONTENT_LENGTH,
} from 'src/domain/artifacts/application/artifacts.errors';
import type { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactVersion } from 'src/domain/artifacts/domain/artifact-version.entity';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { prepareContentForWrite } from 'src/domain/artifacts/application/helpers/prepare-content-for-write';
import { addVersionWithRetry } from 'src/domain/artifacts/application/helpers/add-version-with-retry';
import { runLookup } from 'src/domain/artifacts/application/models/artifact-run';
import { ArtifactPlaceholdersService } from 'src/domain/artifacts/application/services/artifact-placeholders.service';
import type { ArtifactPiiMask } from 'src/domain/artifacts/domain/artifact-pii-mask.entity';

@Injectable()
export class ApplyEditsToArtifactUseCase {
  private readonly logger = new Logger(ApplyEditsToArtifactUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
    private readonly artifactPlaceholdersService: ArtifactPlaceholdersService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(
    command: ApplyEditsToArtifactCommand,
  ): Promise<ArtifactVersion> {
    this.logger.log(
      {
        artifactId: command.artifactId,
        editCount: command.edits.length,
      },
      'Applying edits to artifact',
    );

    const { userId } = getRequiredUserContext(this.contextService);

    const artifact = await this.artifactsRepository.findByIdWithVersions(
      command.artifactId,
      userId,
      runLookup(command.run),
    );
    if (!artifact) {
      throw new ArtifactNotFoundError(command.artifactId);
    }

    this.assertExpectedVersion(command, artifact);

    const currentVersion = artifact.versions.find(
      (v) => v.versionNumber === artifact.currentVersionNumber,
    );
    if (!currentVersion) {
      throw new ArtifactVersionNotFoundError(
        command.artifactId,
        artifact.currentVersionNumber,
      );
    }

    return await this.writeEdits(artifact, currentVersion.content, {
      command,
      userId,
    });
  }

  /**
   * In an anonymous artifact, `old_text` and `new_text` of a run carry the
   * chat's placeholders; they are translated into the artifact's before the
   * edits are matched against the stored content, and the dictionary entries
   * they add are stored with the version.
   */
  private async writeEdits(
    artifact: Artifact,
    currentContent: string,
    { command, userId }: { command: ApplyEditsToArtifactCommand; userId: UUID },
  ): Promise<ArtifactVersion> {
    const edit = (edits: readonly ArtifactEdit[]) =>
      this.validateContentLength(
        prepareContentForWrite(
          artifact.type,
          this.applyEdits(currentContent, edits),
        ),
      );
    if (!artifact.isAnonymous || !command.run) {
      return this.addVersion(command, userId, {
        content: edit(command.edits),
        isAnonymous: artifact.isAnonymous,
        piiMasks: [],
      });
    }
    const draft = await this.artifactPlaceholdersService.fromChat(
      command.run.threadId,
      (translate) => {
        const edits = command.edits.map((e) => ({
          oldText: translate(e.oldText),
          newText: translate(e.newText),
        }));
        return edit(edits);
      },
    );
    return this.artifactPlaceholdersService.write(
      artifact.id,
      draft,
      (content, piiMasks) =>
        this.addVersion(command, userId, {
          content: this.validateContentLength(content),
          isAnonymous: true,
          piiMasks,
        }),
    );
  }

  /**
   * `isAnonymous` is the mode of the artifact the edits were applied to,
   * checked again when the version is stored.
   */
  private async addVersion(
    command: ApplyEditsToArtifactCommand,
    userId: UUID,
    {
      content,
      isAnonymous,
      piiMasks,
    }: { content: string; isAnonymous: boolean; piiMasks: ArtifactPiiMask[] },
  ): Promise<ArtifactVersion> {
    return addVersionWithRetry({
      repository: this.artifactsRepository,
      logger: this.logger,
      artifactId: command.artifactId,
      buildVersion: async () => {
        const freshArtifact = await this.artifactsRepository.findById(
          command.artifactId,
          userId,
          runLookup(command.run),
        );
        if (!freshArtifact) {
          throw new ArtifactNotFoundError(command.artifactId);
        }
        // Translating and masking take time; a write that landed meanwhile
        // must not be overwritten by edits made against the older version.
        this.assertExpectedVersion(command, freshArtifact);
        return {
          expectedCurrentVersionNumber: freshArtifact.currentVersionNumber,
          isAnonymous,
          piiMasks,
          version: new ArtifactVersion({
            artifactId: freshArtifact.id,
            versionNumber: freshArtifact.currentVersionNumber + 1,
            content,
            authorType: command.authorType,
            authorId: command.authorType === AuthorType.USER ? userId : null,
          }),
        };
      },
    });
  }

  private assertExpectedVersion(
    command: ApplyEditsToArtifactCommand,
    artifact: Artifact,
  ): void {
    if (
      command.expectedVersionNumber !== undefined &&
      command.expectedVersionNumber !== artifact.currentVersionNumber
    ) {
      throw new ArtifactExpectedVersionMismatchError(
        artifact,
        command.expectedVersionNumber,
        artifact.currentVersionNumber,
      );
    }
  }

  private applyEdits(
    originalContent: string,
    edits: readonly ArtifactEdit[],
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

    return this.validateContentLength(content);
  }

  private validateContentLength(content: string): string {
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
