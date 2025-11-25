import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
  HttpException,
  HttpStatus,
  Logger,
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
import { UploadFileUseCase } from '../../application/use-cases/upload-file/upload-file.use-case';
import { UploadFileCommand } from '../../application/use-cases/upload-file/upload-file.command';
import { DownloadObjectCommand } from '../../application/use-cases/download-object/download-object.command';
import { DeleteObjectCommand } from '../../application/use-cases/delete-object/delete-object.command';
import { GetObjectInfoCommand } from '../../application/use-cases/get-object-info/get-object-info.command';
import { GetPresignedUrlCommand } from '../../application/use-cases/get-presigned-url/get-presigned-url.command';
import { StorageError } from '../../application/storage.errors';
import { ScopeType } from '../../domain/value-objects/scope-type.enum';
import { StorageResponseDtoMapper } from './mappers/storage-response-dto.mapper';
import { UploadFileResponseDto } from './dto/upload-file-response.dto';

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(
    private readonly uploadFileUseCase: UploadFileUseCase,
    private readonly downloadObjectUseCase: DownloadObjectUseCase,
    private readonly getObjectInfoUseCase: GetObjectInfoUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly getPresignedUrlUseCase: GetPresignedUrlUseCase,
    private readonly storageResponseDtoMapper: StorageResponseDtoMapper,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file' })
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
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: UploadFileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or validation failed',
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('scopeType') scopeType: ScopeType,
    @Query('scopeId') scopeId?: string,
  ): Promise<UploadFileResponseDto> {
    try {
      const command = new UploadFileCommand(file, scopeType, scopeId);
      const result = await this.uploadFileUseCase.execute(command);

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
