import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Readable } from 'stream';
import { DownloadOrgObjectUseCase } from '../../application/use-cases/download-org-object/download-org-object.use-case';
import { DownloadOrgObjectQuery } from '../../application/use-cases/download-org-object/download-org-object.query';

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(
    private readonly downloadOrgObjectUseCase: DownloadOrgObjectUseCase,
  ) {}

  @Get(':objectName')
  @ApiOperation({
    summary: 'Download an image object owned by the requesting organization',
    description:
      'Serves org-prefixed image objects (e.g. chat message images). ' +
      'The object name must start with the requesting user’s organization id.',
  })
  @ApiParam({
    name: 'objectName',
    description: 'Org-prefixed name of the object to retrieve',
  })
  @ApiResponse({ status: 200, description: 'Object streamed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid object name' })
  @ApiResponse({
    status: 403,
    description: 'Object is not owned by the requesting organization',
  })
  @ApiResponse({ status: 404, description: 'Object not found' })
  async getFile(
    @Param('objectName') objectName: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const download = await this.downloadOrgObjectUseCase.execute(
      new DownloadOrgObjectQuery(objectName),
    );

    res.set('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(download.stream as unknown as Readable, {
      type: download.contentType,
      length: download.size,
      disposition: `inline; filename="${download.filename}"`,
    });
  }
}
