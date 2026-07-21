import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  contentTypeToExtension,
  isAllowedImageContentType,
} from 'src/common/util/content-type.util';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { DownloadObjectCommand } from 'src/domain/storage/application/use-cases/download-object/download-object.command';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import {
  MessageImageNotFoundError,
  ThreadNotFoundError,
  UnexpecteThreadError,
  UnsupportedImageContentTypeError,
} from '../../threads.errors';
import { ThreadsRepository } from '../../ports/threads.repository';
import { DownloadMessageImageQuery } from './download-message-image.query';

export interface MessageImageDownload {
  stream: NodeJS.ReadableStream;
  contentType: string;
  filename: string;
}

@Injectable()
export class DownloadMessageImageUseCase {
  private readonly logger = new Logger(DownloadMessageImageUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly threadsRepository: ThreadsRepository,
    private readonly downloadObjectUseCase: DownloadObjectUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(
    query: DownloadMessageImageQuery,
  ): Promise<MessageImageDownload> {
    this.logger.log('Downloading message image', {
      threadId: query.threadId,
      messageId: query.messageId,
      index: query.index,
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

    const message = thread.messages.find((m) => m.id === query.messageId);
    const image = message?.content.find(
      (content): content is ImageMessageContent =>
        content instanceof ImageMessageContent && content.index === query.index,
    );
    if (!image) {
      throw new MessageImageNotFoundError(query.messageId, query.index);
    }

    if (!isAllowedImageContentType(image.contentType)) {
      throw new UnsupportedImageContentTypeError(image.contentType);
    }

    const stream = await this.downloadObjectUseCase.execute(
      new DownloadObjectCommand(
        image.getStoragePath(orgId, query.threadId, query.messageId),
      ),
    );

    return {
      stream,
      contentType: image.contentType,
      filename: `${image.index}${contentTypeToExtension(image.contentType)}`,
    };
  }
}
