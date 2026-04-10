import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { UploadObjectCommand } from 'src/domain/storage/application/use-cases/upload-object/upload-object.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { contentTypeToExtension } from 'src/common/util/content-type.util';
import { GeneratedImagesRepository } from '../../ports/generated-images.repository';
import { GeneratedImage } from '../../../domain/generated-image.entity';
import { GeneratedImageSaveFailedError } from '../../threads.errors';
import { SaveGeneratedImageCommand } from './save-generated-image.command';

@Injectable()
export class SaveGeneratedImageUseCase {
  private readonly logger = new Logger(SaveGeneratedImageUseCase.name);

  constructor(
    private readonly generatedImagesRepository: GeneratedImagesRepository,
    private readonly uploadObjectUseCase: UploadObjectUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
  ) {}

  async execute(command: SaveGeneratedImageCommand): Promise<{ id: UUID }> {
    this.logger.log('execute', {
      orgId: command.orgId,
      threadId: command.threadId,
    });

    try {
      const imageId = randomUUID();
      const ext = contentTypeToExtension(command.contentType);
      const storageKey = `generated-images/${command.orgId}/${command.threadId}/${imageId}${ext}`;

      await this.uploadObjectUseCase.execute(
        new UploadObjectCommand(storageKey, command.imageData, {
          'content-type': command.contentType,
        }),
      );

      const image = new GeneratedImage(
        imageId,
        command.orgId,
        command.userId,
        command.threadId,
        command.contentType,
        command.isAnonymous,
        storageKey,
      );

      try {
        await this.generatedImagesRepository.save(image);
      } catch (dbError) {
        await this.cleanupUploadedObject(storageKey);
        throw dbError;
      }

      this.logger.log('Generated image saved', {
        imageId,
        storageKey,
      });

      return { id: imageId };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to save generated image', {
        orgId: command.orgId,
        threadId: command.threadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new GeneratedImageSaveFailedError(
        error instanceof Error ? error : new Error('Unknown error'),
      );
    }
  }

  private async cleanupUploadedObject(storageKey: string): Promise<void> {
    try {
      await this.deleteObjectUseCase.execute(
        new DeleteObjectCommand(storageKey),
      );
      this.logger.log('Cleaned up orphaned blob after DB save failure', {
        storageKey,
      });
    } catch (cleanupError) {
      this.logger.error('Failed to clean up orphaned blob', {
        storageKey,
        error:
          cleanupError instanceof Error
            ? cleanupError.message
            : 'Unknown error',
      });
    }
  }
}
