import { Request } from 'express';
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { Readable } from 'stream';
import { UploadObjectUseCase } from '../../application/use-cases/upload-object/upload-object.use-case';
import { DownloadObjectUseCase } from '../../application/use-cases/download-object/download-object.use-case';
import { GetObjectInfoUseCase } from '../../application/use-cases/get-object-info/get-object-info.use-case';
import { DeleteObjectUseCase } from '../../application/use-cases/delete-object/delete-object.use-case';
import { GetPresignedUrlUseCase } from '../../application/use-cases/get-presigned-url/get-presigned-url.use-case';
import { UploadObjectCommand } from '../../application/use-cases/upload-object/upload-object.command';
import { DownloadObjectCommand } from '../../application/use-cases/download-object/download-object.command';
import { DeleteObjectCommand } from '../../application/use-cases/delete-object/delete-object.command';
import { GetObjectInfoCommand } from '../../application/use-cases/get-object-info/get-object-info.command';
import { GetPresignedUrlCommand } from '../../application/use-cases/get-presigned-url/get-presigned-url.command';
import {
  BucketNotFoundError,
  DeleteFailedError,
  DownloadFailedError,
  InvalidObjectNameError,
  ObjectNotFoundError,
  StorageError,
  StoragePermissionDeniedError,
  UploadFailedError,
} from '../../application/storage.errors';

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(
    private readonly uploadObjectUseCase: UploadObjectUseCase,
    private readonly downloadObjectUseCase: DownloadObjectUseCase,
    private readonly getObjectInfoUseCase: GetObjectInfoUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly getPresignedUrlUseCase: GetPresignedUrlUseCase,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadFile(@UploadedFile() file: any) {
    try {
      if (!file) {
        throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
      }

      const objectName = `${Date.now()}-${file.originalname}`;

      const command = new UploadObjectCommand(objectName, file.buffer, {
        contentType: file.mimetype,
        originalName: file.originalname,
      });

      const result = await this.uploadObjectUseCase.execute(command);

      return {
        objectName: result.objectName,
        size: result.size,
        etag: result.etag,
        contentType: result.contentType,
        lastModified: result.lastModified,
      };
    } catch (error) {
      this.handleStorageError(error);
    }
  }

  @Get(':objectName')
  @ApiParam({
    name: 'objectName',
    description: 'Name of the object to retrieve',
  })
  async getFile(
    @Param('objectName') objectName: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      // Get object info to set appropriate headers
      const infoCommand = new GetObjectInfoCommand(objectName);
      const info = await this.getObjectInfoUseCase.execute(infoCommand);

      // Set content type if available
      if (info.contentType) {
        res.set('Content-Type', info.contentType);
      }

      // Set content length
      res.set('Content-Length', info.size.toString());

      // Set filename if original name is available
      if (info.originalName) {
        res.set(
          'Content-Disposition',
          `inline; filename="${info.originalName}"`,
        );
      }

      const downloadCommand = new DownloadObjectCommand(objectName);
      const stream = await this.downloadObjectUseCase.execute(downloadCommand);
      return new StreamableFile(stream as unknown as Readable);
    } catch (error) {
      this.handleStorageError(error);
    }
  }

  @Delete(':objectName')
  @ApiParam({ name: 'objectName', description: 'Name of the object to delete' })
  async deleteFile(@Param('objectName') objectName: string) {
    try {
      const command = new DeleteObjectCommand(objectName);
      await this.deleteObjectUseCase.execute(command);
      return { message: 'File deleted successfully' };
    } catch (error) {
      this.handleStorageError(error);
    }
  }

  @Get('url/:objectName')
  @ApiParam({
    name: 'objectName',
    description: 'Name of the object to get URL for',
  })
  async getPresignedUrl(@Param('objectName') objectName: string) {
    try {
      const command = new GetPresignedUrlCommand(objectName, 3600); // 1 hour
      const url = await this.getPresignedUrlUseCase.execute(command);
      return { url };
    } catch (error) {
      this.handleStorageError(error);
    }
  }

  /**
   * Handle storage errors and convert them to appropriate HTTP exceptions
   */
  private handleStorageError(error: any): never {
    this.logger.error('Storage operation failed', error);

    if (error instanceof ObjectNotFoundError) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }

    if (error instanceof BucketNotFoundError) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }

    if (error instanceof InvalidObjectNameError) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }

    if (error instanceof StoragePermissionDeniedError) {
      throw new HttpException(error.message, HttpStatus.FORBIDDEN);
    }

    if (
      error instanceof UploadFailedError ||
      error instanceof DownloadFailedError ||
      error instanceof DeleteFailedError
    ) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (error instanceof StorageError) {
      throw new HttpException(error.message, error.statusCode);
    }

    if (error instanceof HttpException) {
      throw error;
    }

    throw new HttpException(
      'An unexpected error occurred during storage operation',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
