import {
  Controller,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { Response } from 'express';
import { Readable } from 'stream';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { DownloadMessageImageUseCase } from '../../application/use-cases/download-message-image/download-message-image.use-case';
import { DownloadMessageImageQuery } from '../../application/use-cases/download-message-image/download-message-image.query';

@ApiTags('threads')
@Controller('threads')
export class MessageImagesController {
  private readonly logger = new Logger(MessageImagesController.name);

  constructor(
    private readonly downloadMessageImageUseCase: DownloadMessageImageUseCase,
  ) {}

  @Get(':threadId/messages/:messageId/images/:index')
  @ApiOperation({ summary: 'Download an image attached to a message' })
  @ApiParam({ name: 'threadId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'messageId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'index', type: 'number' })
  @ApiResponse({ status: 200, description: 'Image streamed successfully' })
  @ApiResponse({
    status: 404,
    description: 'Thread, message, or image not found',
  })
  async download(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('threadId', ParseUUIDPipe) threadId: UUID,
    @Param('messageId', ParseUUIDPipe) messageId: UUID,
    @Param('index', ParseIntPipe) index: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log('download', { threadId, messageId, index });

    const download = await this.downloadMessageImageUseCase.execute(
      new DownloadMessageImageQuery(threadId, messageId, index, userId),
    );

    res.set('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(download.stream as unknown as Readable, {
      type: download.contentType,
      disposition: `inline; filename="${download.filename}"`,
    });
  }
}
