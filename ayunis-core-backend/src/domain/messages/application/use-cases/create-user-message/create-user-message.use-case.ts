import {
  Injectable,
  Inject,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateUserMessageCommand } from './create-user-message.command';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import {
  MESSAGES_REPOSITORY,
  MessagesRepository,
} from 'src/domain/messages/application/ports/messages.repository';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { MessageCreationError } from 'src/domain/messages/application/messages.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UploadOrgObjectUseCase } from 'src/domain/storage/application/use-cases/upload-org-object/upload-org-object.use-case';
import { UploadOrgObjectCommand } from 'src/domain/storage/application/use-cases/upload-org-object/upload-org-object.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { getImageStoragePath } from 'src/domain/messages/domain/image-storage-path.util';
import { UserMessageCreatedEvent } from 'src/domain/messages/application/events/user-message-created.event';
import type { UUID } from 'crypto';
import {
  ImageNormalizerPort,
  type NormalizableImage,
} from 'src/domain/messages/application/ports/image-normalizer.port';
import { MessageContentInvalidError } from 'src/domain/messages/application/messages.errors';
import { MAX_IMAGE_SIZE_BYTES } from 'src/domain/messages/application/utils/image-upload.policy';
import { sniffAllowedImageContentType } from 'src/common/util/content-type.util';
import type { ImageUploadData } from './create-user-message.command';

interface StorableImage extends NormalizableImage {
  readonly altText?: string;
}

@Injectable()
export class CreateUserMessageUseCase {
  private readonly logger = new Logger(CreateUserMessageUseCase.name);

  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
    private readonly uploadOrgObjectUseCase: UploadOrgObjectUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly contextService: ContextService,
    private readonly eventEmitter: EventEmitter2,
    private readonly imageNormalizer: ImageNormalizerPort,
  ) {}

  async execute(command: CreateUserMessageCommand): Promise<UserMessage> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('Organization context required');
    }

    this.logger.log(
      {
        threadId: command.threadId,
        hasText: !!command.text?.trim(),
        imageCount: command.pendingImages.length,
      },
      'Creating user message',
    );

    const images = await this.normalizeImages(command.pendingImages);
    return this.persistMessage(command, images, orgId);
  }

  private async persistMessage(
    command: CreateUserMessageCommand,
    images: readonly StorableImage[],
    orgId: UUID,
  ): Promise<UserMessage> {
    // Track uploaded images for potential rollback
    const uploadedPaths: string[] = [];

    try {
      const userMessage = this.buildUserMessage(command, images);
      await this.uploadImages(
        command.threadId,
        images,
        orgId,
        userMessage,
        uploadedPaths,
      );
      const savedMessage = (await this.messagesRepository.create(
        userMessage,
      )) as UserMessage;
      this.emitMessageCreated(orgId, command.threadId, savedMessage.id);
      this.logger.log(
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

  private async normalizeImages(
    pendingImages: readonly ImageUploadData[],
  ): Promise<StorableImage[]> {
    const images: StorableImage[] = [];
    // Sequential, so one request decodes at most one image at a time.
    for (const pending of pendingImages) {
      const contentType = sniffAllowedImageContentType(pending.buffer);
      if (!contentType) {
        throw new MessageContentInvalidError('Unsupported image format');
      }
      const normalized = await this.imageNormalizer.normalize({
        buffer: pending.buffer,
        contentType,
      });
      if (normalized.buffer.length > MAX_IMAGE_SIZE_BYTES) {
        throw new MessageContentInvalidError(
          'Image is still too large after downscaling',
        );
      }
      this.logger.debug(
        {
          uploadedBytes: pending.buffer.length,
          storedBytes: normalized.buffer.length,
          contentType: normalized.contentType,
        },
        'Normalized uploaded image',
      );
      images.push({ ...normalized, altText: pending.altText });
    }
    return images;
  }

  private buildUserMessage(
    command: CreateUserMessageCommand,
    images: readonly StorableImage[],
  ): UserMessage {
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
      ...images.map(
        (image, index) =>
          new ImageMessageContent(index, image.contentType, image.altText),
      ),
    );
    return new UserMessage({ threadId: command.threadId, content });
  }

  private async uploadImages(
    threadId: UUID,
    images: readonly StorableImage[],
    orgId: UUID,
    message: UserMessage,
    uploadedPaths: string[],
  ): Promise<void> {
    for (const [index, image] of images.entries()) {
      const storagePath = getImageStoragePath({
        orgId,
        threadId,
        messageId: message.id,
        index,
        contentType: image.contentType,
      });
      this.logger.debug(
        {
          storagePath,
          contentType: image.contentType,
          size: image.buffer.length,
        },
        'Uploading image to storage',
      );
      await this.uploadOrgObjectUseCase.execute(
        new UploadOrgObjectCommand(orgId, storagePath, image.buffer, {
          contentType: image.contentType,
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
