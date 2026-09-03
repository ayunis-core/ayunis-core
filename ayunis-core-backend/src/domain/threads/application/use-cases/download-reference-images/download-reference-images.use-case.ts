import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { streamToBuffer } from 'src/common/util/stream-to-buffer.util';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { DownloadObjectCommand } from 'src/domain/storage/application/use-cases/download-object/download-object.command';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import {
  GeneratedImageNotFoundError,
  MessageImageNotFoundError,
  ThreadNotFoundError,
  UnexpecteThreadError,
  UnsupportedImageContentTypeError,
} from 'src/domain/threads/application/threads.errors';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { GeneratedImagesRepository } from 'src/domain/threads/application/ports/generated-images.repository';
import {
  DownloadReferenceImagesQuery,
  UploadedImageRef,
} from './download-reference-images.query';

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
    this.logger.log(
      {
        threadId: query.threadId,
        uploadedImageCount: query.uploadedImageRefs.length,
        generatedImageCount: query.generatedImageIds.length,
      },
      'Downloading reference images',
    );

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
    const uploaded = await this.downloadUploadedImages(
      thread,
      orgId,
      query.uploadedImageRefs.slice(
        0,
        Math.max(0, MAX_REFERENCE_IMAGES - generated.length),
      ),
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

  private async downloadUploadedImages(
    thread: Thread,
    orgId: string,
    refs: UploadedImageRef[],
  ): Promise<ReferenceImageDownload[]> {
    const images: ReferenceImageDownload[] = [];
    for (const ref of refs) {
      const content = this.findUploadedImage(thread, ref);
      if (!REFERENCE_IMAGE_CONTENT_TYPES.includes(content.contentType)) {
        throw new UnsupportedImageContentTypeError(content.contentType);
      }
      const storagePath = content.getStoragePath(
        orgId,
        thread.id,
        ref.messageId,
      );
      const data = await this.download(storagePath);
      if (this.withinSizeLimit(data, storagePath)) {
        images.push({ data, contentType: content.contentType });
      }
    }
    return images;
  }

  private findUploadedImage(
    thread: Thread,
    ref: UploadedImageRef,
  ): ImageMessageContent {
    const message = thread.messages.find((m) => m.id === ref.messageId);
    const content = message?.content.find(
      (c): c is ImageMessageContent =>
        c instanceof ImageMessageContent && c.index === ref.index,
    );
    if (!content) {
      throw new MessageImageNotFoundError(ref.messageId, ref.index);
    }
    return content;
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
    this.logger.warn(
      {
        fileName: objectName,
        sizeBytes: data.length,
      },
      'Skipping oversized reference image',
    );
    return false;
  }
}
