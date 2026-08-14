import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateUserMessageCommand } from './create-user-message.command';
import { UserMessage } from '../../../domain/messages/user-message.entity';
import {
  MESSAGES_REPOSITORY,
  MessagesRepository,
} from '../../ports/messages.repository';
import { MessageRole } from '../../../domain/value-objects/message-role.object';
import { MessageCreationError } from '../../messages.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { UploadObjectCommand } from 'src/domain/storage/application/use-cases/upload-object/upload-object.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { TextMessageContent } from '../../../domain/message-contents/text-message-content.entity';
import { ImageMessageContent } from '../../../domain/message-contents/image-message-content.entity';
import { getImageStoragePath } from '../../../domain/image-storage-path.util';
import { UserMessageCreatedEvent } from '../../events/user-message-created.event';
import type { UUID } from 'crypto';

@Injectable()
export class CreateUserMessageUseCase {
  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
    private readonly uploadObjectUseCase: UploadObjectUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly contextService: ContextService,
    private readonly eventEmitter: EventEmitter2,
    @InjectPinoLogger(CreateUserMessageUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(command: CreateUserMessageCommand): Promise<UserMessage> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('Organization context required');
    }

    this.logger.info(
      {
        threadId: command.threadId,
        hasText: !!command.text?.trim(),
        imageCount: command.pendingImages.length,
      },
      'Creating user message',
    );

    // Track uploaded images for potential rollback
    const uploadedPaths: string[] = [];

    try {
      const userMessage = this.buildUserMessage(command);
      await this.uploadImages(command, orgId, userMessage, uploadedPaths);
      const savedMessage = (await this.messagesRepository.create(
        userMessage,
      )) as UserMessage;
      this.emitMessageCreated(orgId, command.threadId, savedMessage.id);
      this.logger.info(
        {
          messageId: savedMessage.id,
          threadId: command.threadId,
          imageCount: uploadedPaths.length,
        },
        'User message created successfully',
      );
      return savedMessage;
    } catch (error) {
      this.logger.error(
        {
          threadId: command.threadId,
          uploadedImageCount: uploadedPaths.length,
          err: error as Error,
        },
        'Failed to create user message',
      );

      // Compensating action: cleanup uploaded images
      await this.cleanupUploadedImages(uploadedPaths);

      throw error instanceof Error
        ? new MessageCreationError(MessageRole.USER.toLowerCase(), error)
        : new MessageCreationError(
            MessageRole.USER.toLowerCase(),
            new Error('Unknown error'),
          );
    }
  }

  private buildUserMessage(command: CreateUserMessageCommand): UserMessage {
    const content: (TextMessageContent | ImageMessageContent)[] = [];
    if (command.skillInstructions?.trim()) {
      content.push(
        new TextMessageContent(command.skillInstructions, null, true),
      );
    }
    if (command.text?.trim()) {
      content.push(new TextMessageContent(command.text));
    }
    content.push(
      ...command.pendingImages.map(
        (image, index) =>
          new ImageMessageContent(index, image.contentType, image.altText),
      ),
    );
    return new UserMessage({ threadId: command.threadId, content });
  }

  private async uploadImages(
    command: CreateUserMessageCommand,
    orgId: UUID,
    message: UserMessage,
    uploadedPaths: string[],
  ): Promise<void> {
    for (const [index, pendingImage] of command.pendingImages.entries()) {
      const storagePath = getImageStoragePath({
        orgId,
        threadId: command.threadId,
        messageId: message.id,
        index,
        contentType: pendingImage.contentType,
      });
      this.logger.debug(
        {
          storagePath,
          contentType: pendingImage.contentType,
          size: pendingImage.buffer.length,
        },
        'Uploading image to storage',
      );
      await this.uploadObjectUseCase.execute(
        new UploadObjectCommand(storagePath, pendingImage.buffer, {
          contentType: pendingImage.contentType,
        }),
      );
      uploadedPaths.push(storagePath);
    }
  }

  private emitMessageCreated(
    orgId: UUID,
    threadId: UUID,
    messageId: UUID,
  ): void {
    const userId = this.contextService.get('userId');
    this.eventEmitter
      .emitAsync(
        UserMessageCreatedEvent.EVENT_NAME,
        new UserMessageCreatedEvent(
          userId ?? ('unknown' as UUID),
          orgId,
          threadId,
          messageId,
        ),
      )
      .catch((err: unknown) => {
        this.logger.error(
          {
            error: err instanceof Error ? err.message : 'Unknown error',
            messageId,
          },
          'Failed to emit UserMessageCreatedEvent',
        );
      });
  }

  private async cleanupUploadedImages(paths: string[]): Promise<void> {
    for (const path of paths) {
      try {
        await this.deleteObjectUseCase.execute(new DeleteObjectCommand(path));
        this.logger.debug({ path }, 'Cleaned up orphaned image');
      } catch (deleteError) {
        // Best-effort cleanup - log but don't throw (ObjectNotFoundError is acceptable)
        this.logger.error(
          {
            path,
            err: deleteError as Error,
          },
          'Failed to cleanup orphaned image',
        );
      }
    }
  }
}
