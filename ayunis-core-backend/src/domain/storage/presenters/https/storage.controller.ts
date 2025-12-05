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
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Readable } from 'stream';
import { DownloadObjectUseCase } from '../../application/use-cases/download-object/download-object.use-case';
import { GetObjectInfoUseCase } from '../../application/use-cases/get-object-info/get-object-info.use-case';
import { DeleteObjectUseCase } from '../../application/use-cases/delete-object/delete-object.use-case';
import { GetPresignedUrlUseCase } from '../../application/use-cases/get-presigned-url/get-presigned-url.use-case';
import { UploadObjectUseCase } from '../../application/use-cases/upload-object/upload-object.use-case';
import { UploadObjectCommand } from '../../application/use-cases/upload-object/upload-object.command';
import { DownloadObjectCommand } from '../../application/use-cases/download-object/download-object.command';
import { DeleteObjectCommand } from '../../application/use-cases/delete-object/delete-object.command';
import { GetObjectInfoCommand } from '../../application/use-cases/get-object-info/get-object-info.command';
import { GetPresignedUrlCommand } from '../../application/use-cases/get-presigned-url/get-presigned-url.command';
import { StorageError } from '../../application/storage.errors';
import { StorageResponseDtoMapper } from './mappers/storage-response-dto.mapper';
import { UploadFileResponseDto } from './dto/upload-file-response.dto';

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
    private readonly storageResponseDtoMapper: StorageResponseDtoMapper,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload a file to object storage',
    description:
      'Generic file upload endpoint. Stores the file with optional metadata. ' +
      'Validation (file types, sizes) should be handled by consuming modules.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The file to upload',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: UploadFileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'No file provided or invalid request',
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadFileResponseDto> {
    try {
      if (!file) {
        throw new BadRequestException('No file provided');
      }

      // Generate unique object name with timestamp prefix
      const objectName = `${Date.now()}-${file.originalname}`;

      // Store file metadata
      const metadata: Record<string, string | undefined> = {
        contentType: file.mimetype,
        originalName: file.originalname,
      };

      const command = new UploadObjectCommand(
        objectName,
        file.buffer,
        metadata,
      );
      const result = await this.uploadObjectUseCase.execute(command);

      return this.storageResponseDtoMapper.toUploadFileDto(result);
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
    this.logger.log('Storage getFile request', {
      objectName,
      objectNameLength: objectName.length,
    });
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

    // Handle domain errors - convert to HTTP exceptions
    if (error instanceof StorageError) {
      throw error.toHttpException();
    }

    // Handle NestJS HTTP exceptions as-is
    if (error instanceof HttpException) {
      throw error;
    }

    // Fallback for unexpected errors
    throw new HttpException(
      'An unexpected error occurred during storage operation',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
