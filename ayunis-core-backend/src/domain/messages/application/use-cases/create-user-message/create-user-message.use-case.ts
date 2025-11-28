import {
  Injectable,
  Logger,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserMessageCommand } from './create-user-message.command';
import { UserMessage } from '../../../domain/messages/user-message.entity';
import {
  MESSAGES_REPOSITORY,
  MessagesRepository,
} from '../../ports/messages.repository';
import { MessageRole } from '../../../domain/value-objects/message-role.object';
import { MessageCreationError } from '../../messages.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { ObjectStoragePort } from 'src/domain/storage/application/ports/object-storage.port';
import { StorageObjectUpload } from 'src/domain/storage/domain/storage-object-upload.entity';
import { StorageUrl } from 'src/domain/storage/domain/storage-url.entity';
import { TextMessageContent } from '../../../domain/message-contents/text-message-content.entity';
import { ImageMessageContent } from '../../../domain/message-contents/image-message-content.entity';
import { getImageStoragePath } from '../../../domain/image-storage-path.util';

@Injectable()
export class CreateUserMessageUseCase {
  private readonly logger = new Logger(CreateUserMessageUseCase.name);

  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
    private readonly objectStoragePort: ObjectStoragePort,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: CreateUserMessageCommand): Promise<UserMessage> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('Organization context required');
    }

    this.logger.log('Creating user message', {
      threadId: command.threadId,
      hasText: !!command.text?.trim(),
      imageCount: command.pendingImages.length,
    });

    // Track uploaded images for potential rollback
    const uploadedPaths: string[] = [];

    try {
      // Build content array
      const content: (TextMessageContent | ImageMessageContent)[] = [];

      // Add text content if provided
      if (command.text?.trim()) {
        content.push(new TextMessageContent(command.text));
      }

      // Create ImageMessageContent objects with index and contentType
      const imageContents = command.pendingImages.map(
        (img, index) =>
          new ImageMessageContent(index, img.contentType, img.altText),
      );
      content.push(...imageContents);

      // Create the message to get its ID (UUID generated in constructor)
      const userMessage = new UserMessage({
        threadId: command.threadId,
        content,
      });

      // Upload images to MinIO with deterministic paths
      for (let i = 0; i < command.pendingImages.length; i++) {
        const pendingImage = command.pendingImages[i];
        const storagePath = getImageStoragePath({
          orgId,
          threadId: command.threadId,
          messageId: userMessage.id,
          index: i,
          contentType: pendingImage.contentType,
        });

        this.logger.debug('Uploading image to storage', {
          storagePath,
          contentType: pendingImage.contentType,
          size: pendingImage.buffer.length,
        });

        const uploadObject = new StorageObjectUpload(
          storagePath,
          pendingImage.buffer,
          { contentType: pendingImage.contentType },
        );

        await this.objectStoragePort.upload(uploadObject);
        uploadedPaths.push(storagePath);
      }

      // Save message to database
      const savedMessage = (await this.messagesRepository.create(
        userMessage,
      )) as UserMessage;

      this.logger.log('User message created successfully', {
        messageId: savedMessage.id,
        threadId: command.threadId,
        imageCount: uploadedPaths.length,
      });

      return savedMessage;
    } catch (error) {
      this.logger.error('Failed to create user message', {
        threadId: command.threadId,
        uploadedImageCount: uploadedPaths.length,
        error: error as Error,
      });

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

  private async cleanupUploadedImages(paths: string[]): Promise<void> {
    for (const path of paths) {
      try {
        await this.objectStoragePort.delete(new StorageUrl(path, ''));
        this.logger.debug('Cleaned up orphaned image', { path });
      } catch (deleteError) {
        // Log but don't throw - best effort cleanup
        this.logger.error('Failed to cleanup orphaned image', {
          path,
          error: deleteError as Error,
        });
      }
    }
  }
}
