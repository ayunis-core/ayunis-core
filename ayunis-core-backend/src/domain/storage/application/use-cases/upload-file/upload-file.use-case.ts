import { Injectable, Logger } from '@nestjs/common';
import { UploadObjectUseCase } from '../upload-object/upload-object.use-case';
import { UploadObjectCommand } from '../upload-object/upload-object.command';
import { UploadFileCommand } from './upload-file.command';
import { StorageObject } from '../../../domain/storage-object.entity';
import { ScopeType } from '../../../domain/value-objects/scope-type.enum';
import { FileTypeCategory } from '../../../domain/value-objects/file-type-category.enum';
import {
  FileNotProvidedError,
  FileMimeTypeRequiredError,
  UnsupportedFileTypeError,
  FileValidationFailedError,
  ScopeTypeRequiredError,
} from '../../storage.errors';
import { ApplicationError } from '../../../../../common/errors/base.error';

interface FileTypeConfig {
  allowedMimeTypes: string[];
  maxSizeBytes: number;
  description: string;
}

const IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const DOCUMENT_MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const DATA_MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

@Injectable()
export class UploadFileUseCase {
  private readonly logger = new Logger(UploadFileUseCase.name);

  private readonly fileTypeConfigs: Record<FileTypeCategory, FileTypeConfig> = {
    [FileTypeCategory.IMAGE]: {
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      maxSizeBytes: IMAGE_MAX_SIZE_BYTES,
      description: 'Image files (JPEG, PNG, GIF, WebP)',
    },
    [FileTypeCategory.DOCUMENT]: {
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      maxSizeBytes: DOCUMENT_MAX_SIZE_BYTES,
      description: 'Document files (PDF, DOC, DOCX)',
    },
    [FileTypeCategory.DATA]: {
      allowedMimeTypes: [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
      maxSizeBytes: DATA_MAX_SIZE_BYTES,
      description: 'Data files (CSV, XLS, XLSX)',
    },
  };

  constructor(private readonly uploadObjectUseCase: UploadObjectUseCase) {}

  async execute(command: UploadFileCommand): Promise<StorageObject> {
    this.logger.debug('Uploading file', {
      fileName: command.file.originalname,
      mimeType: command.file.mimetype,
      scopeType: command.scopeType,
    });

    try {
      if (!command.scopeType) {
        throw new ScopeTypeRequiredError();
      }
      if (!command.file) {
        throw new FileNotProvidedError();
      }

      if (!command.file.mimetype) {
        throw new FileMimeTypeRequiredError();
      }

      const scopeType: ScopeType = command.scopeType;

      const fileType = this.getFileTypeCategory(command.file.mimetype);
      if (!fileType) {
        throw new UnsupportedFileTypeError({
          mimeType: command.file.mimetype,
        });
      }

      const validation = this.validateFileType(
        command.file.mimetype,
        command.file.size,
        fileType,
      );
      if (!validation.valid) {
        throw new FileValidationFailedError({
          message: validation.error || 'File validation failed',
        });
      }

      const objectName = `${Date.now()}-${command.file.originalname}`;
      const metadata: Record<string, string | undefined> = {
        contentType: command.file.mimetype,
        originalName: command.file.originalname,
        fileType,
        scopeType,
      };

      if (command.scopeId) {
        metadata.scopeId = command.scopeId;
      }
      const uploadCommand = new UploadObjectCommand(
        objectName,
        command.file.buffer,
        metadata,
      );

      return await this.uploadObjectUseCase.execute(uploadCommand);
    } catch (error) {
      // Re-throw domain errors as-is
      if (error instanceof ApplicationError) {
        throw error;
      }

      // Log and wrap unexpected errors
      this.logger.error('Unexpected error in upload file use case', {
        error: error as Error,
      });
      throw new FileValidationFailedError({
        message: error instanceof Error ? error.message : 'Unknown error',
        metadata: { originalError: error as Error },
      });
    }
  }

  private getFileTypeCategory(mimeType: string): FileTypeCategory | null {
    const categories = Object.keys(this.fileTypeConfigs) as FileTypeCategory[];

    for (const category of categories) {
      const config = this.fileTypeConfigs[category];

      if (config.allowedMimeTypes.includes(mimeType)) {
        return category;
      }
    }

    return null;
  }

  private validateFileType(
    mimeType: string,
    size: number,
    category: FileTypeCategory,
  ): { valid: boolean; error?: string } {
    const config = this.fileTypeConfigs[category];

    if (!config.allowedMimeTypes.includes(mimeType)) {
      return {
        valid: false,
        error: `MIME type ${mimeType} is not allowed for ${category} files. Allowed types: ${config.allowedMimeTypes.join(', ')}`,
      };
    }

    if (size > config.maxSizeBytes) {
      const maxSizeMB = config.maxSizeBytes / (1024 * 1024);
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${maxSizeMB} MB for ${category} files`,
      };
    }

    return { valid: true };
  }
}
