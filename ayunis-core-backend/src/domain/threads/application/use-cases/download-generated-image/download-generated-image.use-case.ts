import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  contentTypeToExtension,
  isAllowedImageContentType,
} from 'src/common/util/content-type.util';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { DownloadObjectCommand } from 'src/domain/storage/application/use-cases/download-object/download-object.command';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { GeneratedImagesRepository } from 'src/domain/threads/application/ports/generated-images.repository';
import {
  ThreadNotFoundError,
  GeneratedImageNotFoundError,
  UnexpecteThreadError,
  UnsupportedImageContentTypeError,
} from 'src/domain/threads/application/threads.errors';
import { DownloadGeneratedImageQuery } from './download-generated-image.query';

export interface GeneratedImageDownload {
  stream: NodeJS.ReadableStream;
  contentType: string;
  filename: string;
}

@Injectable()
export class DownloadGeneratedImageUseCase {
  private readonly logger = new Logger(DownloadGeneratedImageUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly generatedImagesRepository: GeneratedImagesRepository,
    private readonly downloadObjectUseCase: DownloadObjectUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(
    query: DownloadGeneratedImageQuery,
  ): Promise<GeneratedImageDownload> {
    this.logger.log(
      { threadId: query.threadId, imageId: query.imageId },
      'Downloading generated image',
    );

    const ownsThread = await this.threadsRepository.existsForUser(
      query.threadId,
      query.userId,
    );
    if (!ownsThread) {
      throw new ThreadNotFoundError(query.threadId, query.userId);
    }

    const image = await this.generatedImagesRepository.findByIdAndThreadId(
      query.imageId,
      query.threadId,
    );
    if (!image) {
      throw new GeneratedImageNotFoundError(query.imageId);
    }

    if (!isAllowedImageContentType(image.contentType)) {
      throw new UnsupportedImageContentTypeError(image.contentType);
    }

    const stream = await this.downloadObjectUseCase.execute(
      new DownloadObjectCommand(image.storageKey),
    );

    return {
      stream,
      contentType: image.contentType,
      filename: `${image.id}${contentTypeToExtension(image.contentType)}`,
    };
  }
}
