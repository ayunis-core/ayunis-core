import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { streamToBuffer } from 'src/common/util/stream-to-buffer.util';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { DownloadObjectCommand } from 'src/domain/storage/application/use-cases/download-object/download-object.command';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import type { Thread } from '../../../domain/thread.entity';
import {
  GeneratedImageNotFoundError,
  ThreadNotFoundError,
  UnexpecteThreadError,
} from '../../threads.errors';
import { ThreadsRepository } from '../../ports/threads.repository';
import { GeneratedImagesRepository } from '../../ports/generated-images.repository';
import { DownloadReferenceImagesQuery } from './download-reference-images.query';

export interface ReferenceImageDownload {
  data: Buffer;
  contentType: string;
}

// The provider's image-edit API accepts at most 16 reference images per call,
// and only these formats (notably no GIF, which chat uploads allow).
const MAX_REFERENCE_IMAGES = 16;
const REFERENCE_IMAGE_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
// Matches the chat upload limit; also bounds worst-case memory per request
// (16 references are buffered in full before the provider call).
const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class DownloadReferenceImagesUseCase {
  private readonly logger = new Logger(DownloadReferenceImagesUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly threadsRepository: ThreadsRepository,
    private readonly generatedImagesRepository: GeneratedImagesRepository,
    private readonly downloadObjectUseCase: DownloadObjectUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(
    query: DownloadReferenceImagesQuery,
  ): Promise<ReferenceImageDownload[]> {
    this.logger.log('Downloading reference images', {
      threadId: query.threadId,
      includeUploadedImages: query.includeUploadedImages,
      generatedImageCount: query.generatedImageIds.length,
    });

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    const thread = await this.threadsRepository.findOne(
      query.threadId,
      query.userId,
    );
    if (!thread) {
      throw new ThreadNotFoundError(query.threadId, query.userId);
    }

    const generated = await this.downloadGeneratedImages(query);
    if (!query.includeUploadedImages) {
      return generated;
    }
    const uploaded = await this.downloadUploadedImages(
      thread,
      orgId,
      MAX_REFERENCE_IMAGES - generated.length,
    );
    return [...generated, ...uploaded];
  }

  private async downloadGeneratedImages(
    query: DownloadReferenceImagesQuery,
  ): Promise<ReferenceImageDownload[]> {
    const images: ReferenceImageDownload[] = [];
    for (const imageId of query.generatedImageIds.slice(
      0,
      MAX_REFERENCE_IMAGES,
    )) {
      const image = await this.generatedImagesRepository.findByIdAndThreadId(
        imageId,
        query.threadId,
      );
      if (!image) {
        throw new GeneratedImageNotFoundError(imageId);
      }
      const data = await this.download(image.storageKey);
      if (this.withinSizeLimit(data, image.storageKey)) {
        images.push({ data, contentType: image.contentType });
      }
    }
    return images;
  }

  // Newest messages first: the latest upload is the most likely reference.
  private async downloadUploadedImages(
    thread: Thread,
    orgId: string,
    limit: number,
  ): Promise<ReferenceImageDownload[]> {
    const images: ReferenceImageDownload[] = [];
    for (const message of [...thread.messages].reverse()) {
      for (const content of message.content) {
        if (images.length >= limit) {
          return images;
        }
        if (
          !(content instanceof ImageMessageContent) ||
          !REFERENCE_IMAGE_CONTENT_TYPES.includes(content.contentType)
        ) {
          continue;
        }
        const storagePath = content.getStoragePath(
          orgId,
          thread.id,
          message.id,
        );
        const data = await this.download(storagePath);
        if (this.withinSizeLimit(data, storagePath)) {
          images.push({ data, contentType: content.contentType });
        }
      }
    }
    return images;
  }

  private async download(objectName: string): Promise<Buffer> {
    const stream = await this.downloadObjectUseCase.execute(
      new DownloadObjectCommand(objectName),
    );
    return streamToBuffer(stream);
  }

  private withinSizeLimit(data: Buffer, objectName: string): boolean {
    if (data.length <= MAX_REFERENCE_IMAGE_BYTES) {
      return true;
    }
    this.logger.warn('Skipping oversized reference image', {
      objectName,
      sizeBytes: data.length,
    });
    return false;
  }
}
