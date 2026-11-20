import { Injectable, Logger } from '@nestjs/common';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  contentTypeToExtension,
  isAllowedImageContentType,
} from 'src/common/util/content-type.util';
import { NotificationMediaType } from 'src/domain/notifications/domain/notification-media';
import { ReleaseNotesRepository } from 'src/domain/release-notes/application/ports/release-notes.repository';
import {
  ReleaseNoteImageNotFoundError,
  ReleaseNoteNotFoundError,
  UnexpectedReleaseNoteError,
} from 'src/domain/release-notes/application/release-notes.errors';
import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';
import { DownloadObjectCommand } from 'src/domain/storage/application/use-cases/download-object/download-object.command';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { DownloadReleaseNoteImageQuery } from './download-release-note-image.query';

export interface ReleaseNoteImageDownload {
  stream: NodeJS.ReadableStream;
  contentType: string;
  filename: string;
}

@Injectable()
export class DownloadReleaseNoteImageUseCase {
  private readonly logger = new Logger(DownloadReleaseNoteImageUseCase.name);

  constructor(
    private readonly releaseNotesRepository: ReleaseNotesRepository,
    private readonly downloadObjectUseCase: DownloadObjectUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedReleaseNoteError)
  async execute(
    query: DownloadReleaseNoteImageQuery,
  ): Promise<ReleaseNoteImageDownload> {
    const { releaseNoteId } = query;
    this.logger.log({ releaseNoteId }, 'Downloading release note image');
    const { userId } = getRequiredUserContext(this.contextService);
    const releaseNote = await this.releaseNotesRepository.findOneForUser(
      userId,
      releaseNoteId,
    );
    if (!releaseNote) throw new ReleaseNoteNotFoundError(releaseNoteId);
    const { media } = releaseNote.note;
    if (
      media?.type !== NotificationMediaType.IMAGE ||
      !isAllowedImageContentType(media.contentType)
    ) {
      throw new ReleaseNoteImageNotFoundError(releaseNoteId);
    }
    const stream = await this.downloadObjectUseCase
      .execute(new DownloadObjectCommand(media.storageKey))
      .catch((error: unknown) => {
        // The storage error names the object key, which clients never see.
        if (error instanceof ObjectNotFoundError) {
          throw new ReleaseNoteImageNotFoundError(releaseNoteId);
        }
        throw error;
      });
    return {
      stream,
      contentType: media.contentType,
      filename: `${releaseNoteId}${contentTypeToExtension(media.contentType)}`,
    };
  }
}
