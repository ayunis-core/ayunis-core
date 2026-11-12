import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { ChangeRecordingOwnerCommand } from 'src/domain/recordings/application/use-cases/change-recording-owner/change-recording-owner.command';
import { ChangeRecordingOwnerUseCase } from 'src/domain/recordings/application/use-cases/change-recording-owner/change-recording-owner.use-case';
import { CreateRecordingCommand } from 'src/domain/recordings/application/use-cases/create-recording/create-recording.command';
import { CreateRecordingUseCase } from 'src/domain/recordings/application/use-cases/create-recording/create-recording.use-case';
import { DeleteRecordingCommand } from 'src/domain/recordings/application/use-cases/delete-recording/delete-recording.command';
import { DeleteRecordingUseCase } from 'src/domain/recordings/application/use-cases/delete-recording/delete-recording.use-case';
import { FindRecordingQuery } from 'src/domain/recordings/application/use-cases/find-recording/find-recording.query';
import { FindRecordingUseCase } from 'src/domain/recordings/application/use-cases/find-recording/find-recording.use-case';
import { GetRecordingTranscriptQuery } from 'src/domain/recordings/application/use-cases/get-recording-transcript/get-recording-transcript.query';
import { GetRecordingTranscriptUseCase } from 'src/domain/recordings/application/use-cases/get-recording-transcript/get-recording-transcript.use-case';
import { ListRecordingsQuery } from 'src/domain/recordings/application/use-cases/list-recordings/list-recordings.query';
import { ListRecordingsUseCase } from 'src/domain/recordings/application/use-cases/list-recordings/list-recordings.use-case';
import { RenameRecordingCommand } from 'src/domain/recordings/application/use-cases/rename-recording/rename-recording.command';
import { RenameRecordingUseCase } from 'src/domain/recordings/application/use-cases/rename-recording/rename-recording.use-case';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { CreateRecordingDto } from './dto/create-recording.dto';
import {
  RecordingListScopeDto,
  RecordingTransferOwnerDto,
  toRecordingListScope,
  toRecordingOwner,
  toRecordingTransferOwner,
} from './dto/recording-owner.dto';
import {
  RecordingListResponseDto,
  RecordingResponseDto,
} from './dto/recording-response.dto';
import { RecordingTranscriptResponseDto } from './dto/recording-transcript-response.dto';
import { RenameRecordingDto } from './dto/rename-recording.dto';
import { RecordingDtoMapper } from './mappers/recording-dto.mapper';

@ApiTags('recordings')
@RequireFeature(FeatureFlag.Recordings)
@Controller('recordings')
export class RecordingsController {
  private readonly logger = new Logger(RecordingsController.name);

  constructor(
    private readonly createRecording: CreateRecordingUseCase,
    private readonly listRecordings: ListRecordingsUseCase,
    private readonly findRecording: FindRecordingUseCase,
    private readonly renameRecording: RenameRecordingUseCase,
    private readonly changeRecordingOwner: ChangeRecordingOwnerUseCase,
    private readonly deleteRecording: DeleteRecordingUseCase,
    private readonly getTranscript: GetRecordingTranscriptUseCase,
    private readonly mapper: RecordingDtoMapper,
  ) {}

  @RequirePermission(Permission.MANAGE_RECORDINGS)
  @Post()
  @ApiOperation({ summary: 'Create a recording' })
  @ApiResponse({ status: 201, type: RecordingResponseDto })
  async create(@Body() dto: CreateRecordingDto): Promise<RecordingResponseDto> {
    this.logger.log({ ownerType: dto.ownerType }, 'create');
    const recording = await this.createRecording.execute(
      new CreateRecordingCommand(dto.name, toRecordingOwner(dto)),
    );
    return this.findOne(recording.id);
  }

  @Get()
  @ApiOperation({
    summary:
      'List the recordings of the user, their teams and organization, or of a workspace',
  })
  @ApiResponse({ status: 200, type: RecordingListResponseDto })
  async findAll(
    @Query() query: RecordingListScopeDto,
  ): Promise<RecordingListResponseDto> {
    const recordings = await this.listRecordings.execute(
      new ListRecordingsQuery(toRecordingListScope(query)),
    );
    return {
      data: recordings.map((recording) => this.mapper.toDto(recording)),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a recording' })
  @ApiResponse({ status: 200, type: RecordingResponseDto })
  @ApiResponse({ status: 404, description: 'Recording not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<RecordingResponseDto> {
    return this.mapper.toDto(
      await this.findRecording.execute(new FindRecordingQuery(id)),
    );
  }

  @Get(':id/transcript')
  @ApiOperation({ summary: "Get a recording's transcript as speaker turns" })
  @ApiResponse({ status: 200, type: RecordingTranscriptResponseDto })
  @ApiResponse({ status: 404, description: 'Recording not found' })
  async transcript(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<RecordingTranscriptResponseDto> {
    const turns = await this.getTranscript.execute(
      new GetRecordingTranscriptQuery(id),
    );
    return { turns };
  }

  @RequirePermission(Permission.MANAGE_RECORDINGS)
  @Patch(':id')
  @ApiOperation({ summary: 'Rename a recording' })
  @ApiResponse({ status: 200, type: RecordingResponseDto })
  @ApiResponse({ status: 404, description: 'Recording not found' })
  async rename(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: RenameRecordingDto,
  ): Promise<RecordingResponseDto> {
    this.logger.log({ id }, 'rename');
    await this.renameRecording.execute(
      new RenameRecordingCommand(id, dto.name),
    );
    return this.findOne(id);
  }

  @RequirePermission(Permission.MANAGE_RECORDINGS)
  @Patch(':id/owner')
  @ApiOperation({
    summary: 'Move a recording to the caller, a team or the organization',
  })
  @ApiResponse({ status: 200, type: RecordingResponseDto })
  @ApiResponse({ status: 404, description: 'Recording not found' })
  async changeOwner(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: RecordingTransferOwnerDto,
  ): Promise<RecordingResponseDto> {
    this.logger.log({ id, ownerType: dto.ownerType }, 'changeOwner');
    await this.changeRecordingOwner.execute(
      new ChangeRecordingOwnerCommand(id, toRecordingTransferOwner(dto)),
    );
    return this.findOne(id);
  }

  @RequirePermission(Permission.MANAGE_RECORDINGS)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a recording' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Recording not found' })
  async delete(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    this.logger.log({ id }, 'delete');
    await this.deleteRecording.execute(new DeleteRecordingCommand(id));
  }
}
