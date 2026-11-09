import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { SignSourceUploadRequestUseCase } from 'src/domain/sources/application/use-cases/sign-source-upload-request/sign-source-upload-request.use-case';
import { SignSourceUploadRequestCommand } from 'src/domain/sources/application/use-cases/sign-source-upload-request/sign-source-upload-request.command';
import { AbortSourceUploadUseCase } from 'src/domain/sources/application/use-cases/abort-source-upload/abort-source-upload.use-case';
import { AbortSourceUploadCommand } from 'src/domain/sources/application/use-cases/abort-source-upload/abort-source-upload.command';
import { SignSourceUploadRequestDto } from './dto/sign-source-upload-request.dto';
import { SignedUploadUrlResponseDto } from './dto/signed-upload-url-response.dto';
import { toSignedUploadUrlDto } from './mappers/source-upload.mapper';

const UPLOAD_ID_PARAM = {
  name: 'id',
  description: 'The upload id returned when the upload was created',
  type: 'string',
  format: 'uuid',
} as const;

/**
 * Byte-transfer side of direct source uploads. Sessions are created and
 * completed on their target (thread, skill, knowledge base); these endpoints
 * only sign storage requests for a session the caller owns.
 */
@ApiTags('source-uploads')
@Controller('source-uploads')
export class SourceUploadsController {
  private readonly logger = new Logger(SourceUploadsController.name);

  constructor(
    private readonly signRequest: SignSourceUploadRequestUseCase,
    private readonly abortUpload: AbortSourceUploadUseCase,
  ) {}

  @Post(':id/sign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign one storage request of a direct upload',
    description:
      "Returns a short-lived pre-signed URL for the given S3 request on the upload's server-chosen key. Call again to retry after the URL expired.",
  })
  @ApiParam(UPLOAD_ID_PARAM)
  @ApiResponse({ status: 200, type: SignedUploadUrlResponseDto })
  @ApiResponse({
    status: 400,
    description: "The request does not fit the upload's transfer mode",
  })
  @ApiResponse({ status: 404, description: 'Upload not found' })
  @ApiResponse({ status: 410, description: 'Upload expired or aborted' })
  async sign(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: SignSourceUploadRequestDto,
  ): Promise<SignedUploadUrlResponseDto> {
    this.logger.log({ uploadId: id, method: dto.method }, 'sign');
    return toSignedUploadUrlDto(
      await this.signRequest.execute(
        new SignSourceUploadRequestCommand({
          uploadId: id,
          method: dto.method,
          multipartUploadId: dto.uploadId,
          partNumber: dto.partNumber,
        }),
      ),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Abort an upload and discard what was transferred',
    description: 'A no-op for uploads that were already completed.',
  })
  @ApiParam(UPLOAD_ID_PARAM)
  @ApiResponse({ status: 204, description: 'Upload aborted' })
  @ApiResponse({ status: 404, description: 'Upload not found' })
  async abort(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    this.logger.log({ uploadId: id }, 'abort');
    await this.abortUpload.execute(new AbortSourceUploadCommand(id));
  }
}
