import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { CompleteRecordingUploadCommand } from 'src/domain/recordings/application/use-cases/complete-recording-upload/complete-recording-upload.command';
import { CompleteRecordingUploadUseCase } from 'src/domain/recordings/application/use-cases/complete-recording-upload/complete-recording-upload.use-case';
import { CreateRecordingUploadCommand } from 'src/domain/recordings/application/use-cases/create-recording-upload/create-recording-upload.command';
import { CreateRecordingUploadUseCase } from 'src/domain/recordings/application/use-cases/create-recording-upload/create-recording-upload.use-case';
import { CreateSourceUploadDto } from 'src/domain/sources/presenters/http/dto/create-source-upload.dto';
import { SourceUploadSessionResponseDto } from 'src/domain/sources/presenters/http/dto/source-upload-session-response.dto';
import { toSourceUploadSessionDto } from 'src/domain/sources/presenters/http/mappers/source-upload.mapper';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { RecordingResponseDto } from './dto/recording-response.dto';
import { RecordingDtoMapper } from './mappers/recording-dto.mapper';

const RECORDING_ID_PARAM = {
  name: 'id',
  description: 'The UUID of the recording',
  type: 'string',
  format: 'uuid',
} as const;

/** Direct (browser → object storage) upload of a recording's audio. */
@ApiTags('recordings')
@RequireFeature(FeatureFlag.Recordings)
@Controller('recordings')
export class RecordingUploadsController {
  private readonly logger = new Logger(RecordingUploadsController.name);

  constructor(
    private readonly createUploadUseCase: CreateRecordingUploadUseCase,
    private readonly completeUploadUseCase: CompleteRecordingUploadUseCase,
    private readonly mapper: RecordingDtoMapper,
  ) {}

  @RequirePermission(Permission.MANAGE_RECORDINGS)
  @Post(':id/uploads')
  @ApiOperation({
    summary: "Create the direct upload of a recording's audio",
    description:
      'Checks access, that the recording has no audio yet, the audio type and AUDIO_MAX_UPLOAD_BYTES, then reserves an upload the browser transfers straight to object storage via the /source-uploads endpoints. Complete it with POST /recordings/{id}/uploads/{uploadId}/complete.',
  })
  @ApiParam(RECORDING_ID_PARAM)
  @ApiResponse({ status: 201, type: SourceUploadSessionResponseDto })
  @ApiResponse({ status: 400, description: 'Not an audio file' })
  @ApiResponse({ status: 403, description: 'The recording is read-only' })
  @ApiResponse({ status: 404, description: 'Recording not found' })
  @ApiResponse({ status: 409, description: 'The recording has its audio' })
  @ApiResponse({ status: 413, description: 'File exceeds the upload limit' })
  async createUpload(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: CreateSourceUploadDto,
  ): Promise<SourceUploadSessionResponseDto> {
    this.logger.log(
      { recordingId: id, fileName: dto.fileName },
      'createUpload',
    );
    return toSourceUploadSessionDto(
      await this.createUploadUseCase.execute(
        new CreateRecordingUploadCommand({ recordingId: id, ...dto }),
      ),
    );
  }

  @RequirePermission(Permission.MANAGE_RECORDINGS)
  @Post(':id/uploads/:uploadId/complete')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Complete the direct upload of a recording's audio",
    description:
      'Verifies the stored file, makes it the audio of the recording and queues its transcription. Safe to repeat.',
  })
  @ApiParam(RECORDING_ID_PARAM)
  @ApiParam({
    name: 'uploadId',
    description: 'The upload id',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ status: 202, type: RecordingResponseDto })
  @ApiResponse({ status: 404, description: 'Recording or upload not found' })
  @ApiResponse({
    status: 409,
    description:
      'The file was not fully transferred, or the recording has its audio',
  })
  @ApiResponse({ status: 410, description: 'The upload expired' })
  async completeUpload(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('uploadId', ParseUUIDPipe) uploadId: UUID,
  ): Promise<RecordingResponseDto> {
    this.logger.log({ recordingId: id, uploadId }, 'completeUpload');
    return this.mapper.toDto(
      await this.completeUploadUseCase.execute(
        new CompleteRecordingUploadCommand(id, uploadId),
      ),
    );
  }
}
