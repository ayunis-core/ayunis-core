import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { UploadObjectCommand } from 'src/domain/storage/application/use-cases/upload-object/upload-object.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import {
  contentTypeToExtension,
  isAllowedImageContentType,
} from 'src/common/util/content-type.util';
import { GeneratedImagesRepository } from '../../ports/generated-images.repository';
import { GeneratedImage } from '../../../domain/generated-image.entity';
import {
  GeneratedImageSaveFailedError,
  UnsupportedImageContentTypeError,
} from '../../threads.errors';
import { SaveGeneratedImageCommand } from './save-generated-image.command';

@Injectable()
export class SaveGeneratedImageUseCase {
  constructor(
    @InjectPinoLogger(SaveGeneratedImageUseCase.name)
    private readonly logger: PinoLogger,
    private readonly generatedImagesRepository: GeneratedImagesRepository,
    private readonly uploadObjectUseCase: UploadObjectUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
  ) {}

  async execute(command: SaveGeneratedImageCommand): Promise<{ id: UUID }> {
    const logContext = {
      orgId: command.orgId,
      threadId: command.threadId,
    };
    this.logger.info(logContext, 'execute');
    if (!isAllowedImageContentType(command.contentType)) {
      throw new UnsupportedImageContentTypeError(command.contentType);
    }

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

      const savedLogContext = { imageId, fileName: storageKey };
      this.logger.info(savedLogContext, 'Generated image saved');

      return { id: imageId };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        { ...logContext, err: error as Error },
        'Failed to save generated image',
      );
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
      this.logger.info(
        {
          fileName: storageKey,
        },
        'Cleaned up orphaned blob after DB save failure',
      );
    } catch (cleanupError) {
      this.logger.error(
        {
          fileName: storageKey,
          err: cleanupError as Error,
        },
        'Failed to clean up orphaned blob',
      );
    }
  }
}
