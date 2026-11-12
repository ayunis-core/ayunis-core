import {
  Controller,
  Get,
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
import { FindRecordingQuery } from 'src/domain/recordings/application/use-cases/find-recording/find-recording.query';
import { FindRecordingUseCase } from 'src/domain/recordings/application/use-cases/find-recording/find-recording.use-case';
import { GetRecordingSummaryQuery } from 'src/domain/recordings/application/use-cases/get-recording-summary/get-recording-summary.query';
import { GetRecordingSummaryUseCase } from 'src/domain/recordings/application/use-cases/get-recording-summary/get-recording-summary.use-case';
import { RetryRecordingSummaryCommand } from 'src/domain/recordings/application/use-cases/retry-recording-summary/retry-recording-summary.command';
import { RetryRecordingSummaryUseCase } from 'src/domain/recordings/application/use-cases/retry-recording-summary/retry-recording-summary.use-case';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { RecordingResponseDto } from './dto/recording-response.dto';
import { RecordingSummaryResponseDto } from './dto/recording-summary-response.dto';
import { RecordingDtoMapper } from './mappers/recording-dto.mapper';

const RECORDING_ID_PARAM = {
  name: 'id',
  description: 'The UUID of the recording',
  type: 'string',
  format: 'uuid',
} as const;

/** A recording's summary, generated in the background once it is transcribed. */
@ApiTags('recordings')
@RequireFeature(FeatureFlag.Recordings)
@Controller('recordings')
export class RecordingSummaryController {
  private readonly logger = new Logger(RecordingSummaryController.name);

  constructor(
    private readonly getSummary: GetRecordingSummaryUseCase,
    private readonly retrySummary: RetryRecordingSummaryUseCase,
    private readonly findRecording: FindRecordingUseCase,
    private readonly mapper: RecordingDtoMapper,
  ) {}

  @Get(':id/summary')
  @ApiOperation({ summary: "Get a recording's generated summary" })
  @ApiParam(RECORDING_ID_PARAM)
  @ApiResponse({ status: 200, type: RecordingSummaryResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Recording not found, or its summary is not generated',
  })
  async summary(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<RecordingSummaryResponseDto> {
    const { content } = await this.getSummary.execute(
      new GetRecordingSummaryQuery(id),
    );
    return { content: content ?? '' };
  }

  @RequirePermission(Permission.MANAGE_RECORDINGS)
  @Post(':id/summary/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Try a failed summary again',
    description:
      'Queues a new summary run, billed to the caller. While a run is queued or running, nothing more is queued.',
  })
  @ApiParam(RECORDING_ID_PARAM)
  @ApiResponse({ status: 200, type: RecordingResponseDto })
  @ApiResponse({ status: 403, description: 'The recording is read-only' })
  @ApiResponse({ status: 404, description: 'Recording not found' })
  @ApiResponse({
    status: 409,
    description: 'The summary is generated, or the transcript is not ready',
  })
  async retry(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<RecordingResponseDto> {
    this.logger.log({ recordingId: id }, 'retry');
    await this.retrySummary.execute(new RetryRecordingSummaryCommand(id));
    return this.mapper.toDto(
      await this.findRecording.execute(new FindRecordingQuery(id)),
    );
  }
}
