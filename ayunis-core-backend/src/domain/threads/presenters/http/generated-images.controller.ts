import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
  StreamableFile,
  Logger,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { Response } from 'express';
import { Readable } from 'stream';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { DownloadGeneratedImageUseCase } from 'src/domain/threads/application/use-cases/download-generated-image/download-generated-image.use-case';
import { DownloadGeneratedImageQuery } from 'src/domain/threads/application/use-cases/download-generated-image/download-generated-image.query';

@ApiTags('threads')
@Controller('threads')
export class GeneratedImagesController {
  private readonly logger = new Logger(GeneratedImagesController.name);

  constructor(
    private readonly downloadGeneratedImageUseCase: DownloadGeneratedImageUseCase,
  ) {}

  @Get(':threadId/generated-images/:imageId')
  @ApiOperation({ summary: 'Download a generated image' })
  @ApiParam({ name: 'threadId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'imageId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Image streamed successfully' })
  @ApiResponse({ status: 404, description: 'Thread or image not found' })
  async download(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('threadId', ParseUUIDPipe) threadId: UUID,
    @Param('imageId', ParseUUIDPipe) imageId: UUID,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log({ threadId, imageId }, 'download');

    const download = await this.downloadGeneratedImageUseCase.execute(
      new DownloadGeneratedImageQuery(threadId, imageId, userId),
    );

    res.set('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(download.stream as unknown as Readable, {
      type: download.contentType,
      disposition: `inline; filename="${download.filename}"`,
    });
  }
}
