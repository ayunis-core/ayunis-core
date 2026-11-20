import {
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Readable } from 'stream';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { CountUnreadReleaseNotesUseCase } from 'src/domain/release-notes/application/use-cases/count-unread-release-notes/count-unread-release-notes.use-case';
import { DownloadReleaseNoteImageQuery } from 'src/domain/release-notes/application/use-cases/download-release-note-image/download-release-note-image.query';
import { DownloadReleaseNoteImageUseCase } from 'src/domain/release-notes/application/use-cases/download-release-note-image/download-release-note-image.use-case';
import { FindMyReleaseNotesUseCase } from 'src/domain/release-notes/application/use-cases/find-my-release-notes/find-my-release-notes.use-case';
import { FindReleaseNoteQuery } from 'src/domain/release-notes/application/use-cases/find-release-note/find-release-note.query';
import { FindReleaseNoteUseCase } from 'src/domain/release-notes/application/use-cases/find-release-note/find-release-note.use-case';
import { MarkReleaseNoteReadCommand } from 'src/domain/release-notes/application/use-cases/mark-release-note-read/mark-release-note-read.command';
import { MarkReleaseNoteReadUseCase } from 'src/domain/release-notes/application/use-cases/mark-release-note-read/mark-release-note-read.use-case';
import { ReleaseNoteParamsDto } from './dto/release-note-params.dto';
import {
  ReleaseNoteResponseDto,
  UnreadReleaseNoteCountResponseDto,
} from './dto/release-note-response.dto';
import { ReleaseNoteDtoMapper } from './mappers/release-note-dto.mapper';

/**
 * Ayunis' product updates. Every signed-in user reads the same notes; only
 * the read state is per user.
 */
@ApiTags('release-notes')
@RequireFeature(FeatureFlag.ReleaseNotes)
@Controller('release-notes')
export class ReleaseNotesController {
  private readonly logger = new Logger(ReleaseNotesController.name);

  constructor(
    private readonly findMyReleaseNotesUseCase: FindMyReleaseNotesUseCase,
    private readonly countUnreadReleaseNotesUseCase: CountUnreadReleaseNotesUseCase,
    private readonly findReleaseNoteUseCase: FindReleaseNoteUseCase,
    private readonly markReleaseNoteReadUseCase: MarkReleaseNoteReadUseCase,
    private readonly downloadReleaseNoteImageUseCase: DownloadReleaseNoteImageUseCase,
    private readonly releaseNoteDtoMapper: ReleaseNoteDtoMapper,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the newest release notes, newest first' })
  @ApiResponse({ status: 200, type: [ReleaseNoteResponseDto] })
  async findAll(): Promise<ReleaseNoteResponseDto[]> {
    this.logger.log('findAll');
    const releaseNotes = await this.findMyReleaseNotesUseCase.execute();
    return releaseNotes.map((note) => this.releaseNoteDtoMapper.toDto(note));
  }

  @Get('unread-count')
  @ApiOperation({ summary: "Count the current user's unread release notes" })
  @ApiResponse({ status: 200, type: UnreadReleaseNoteCountResponseDto })
  async countUnread(): Promise<UnreadReleaseNoteCountResponseDto> {
    return { count: await this.countUnreadReleaseNotesUseCase.execute() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one release note' })
  @ApiResponse({ status: 200, type: ReleaseNoteResponseDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(
    @Param() { id }: ReleaseNoteParamsDto,
  ): Promise<ReleaseNoteResponseDto> {
    this.logger.log({ id }, 'findOne');
    const releaseNote = await this.findReleaseNoteUseCase.execute(
      new FindReleaseNoteQuery(id),
    );
    return this.releaseNoteDtoMapper.toDto(releaseNote);
  }

  @Get(':id/image')
  @ApiOperation({ summary: 'Download the image of a release note' })
  @ApiResponse({ status: 200, description: 'Image streamed successfully' })
  @ApiResponse({ status: 404, description: 'Not found or without an image' })
  async downloadImage(
    @Param() { id }: ReleaseNoteParamsDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log({ id }, 'downloadImage');
    const download = await this.downloadReleaseNoteImageUseCase.execute(
      new DownloadReleaseNoteImageQuery(id),
    );
    res.set('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(download.stream as unknown as Readable, {
      type: download.contentType,
      disposition: `inline; filename="${download.filename}"`,
    });
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark a release note read for the current user' })
  @ApiResponse({ status: 201, type: ReleaseNoteResponseDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  async markRead(
    @Param() { id }: ReleaseNoteParamsDto,
  ): Promise<ReleaseNoteResponseDto> {
    this.logger.log({ id }, 'markRead');
    const releaseNote = await this.markReleaseNoteReadUseCase.execute(
      new MarkReleaseNoteReadCommand(id),
    );
    return this.releaseNoteDtoMapper.toDto(releaseNote);
  }
}
