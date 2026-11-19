import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Res,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  NotFoundException,
  HttpCode,
  HttpStatus,
  StreamableFile,
  Logger,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiProduces,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Readable } from 'stream';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { DownloadObjectCommand } from 'src/domain/storage/application/use-cases/download-object/download-object.command';
import type { UUID } from 'crypto';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { CreateLetterheadUseCase } from 'src/domain/letterheads/application/use-cases/create-letterhead/create-letterhead.use-case';
import { FindAllLetterheadsUseCase } from 'src/domain/letterheads/application/use-cases/find-all-letterheads/find-all-letterheads.use-case';
import { FindLetterheadUseCase } from 'src/domain/letterheads/application/use-cases/find-letterhead/find-letterhead.use-case';
import { UpdateLetterheadUseCase } from 'src/domain/letterheads/application/use-cases/update-letterhead/update-letterhead.use-case';
import { DeleteLetterheadUseCase } from 'src/domain/letterheads/application/use-cases/delete-letterhead/delete-letterhead.use-case';
import { CreateLetterheadCommand } from 'src/domain/letterheads/application/use-cases/create-letterhead/create-letterhead.command';
import { FindLetterheadQuery } from 'src/domain/letterheads/application/use-cases/find-letterhead/find-letterhead.query';
import { UpdateLetterheadCommand } from 'src/domain/letterheads/application/use-cases/update-letterhead/update-letterhead.command';
import { DeleteLetterheadCommand } from 'src/domain/letterheads/application/use-cases/delete-letterhead/delete-letterhead.command';
import { CreateLetterheadDto } from './dtos/create-letterhead.dto';
import { UpdateLetterheadDto } from './dtos/update-letterhead.dto';
import { PreviewLetterheadDto } from './dtos/preview-letterhead.dto';
import { PreviewLetterheadUseCase } from 'src/domain/letterheads/application/use-cases/preview-letterhead/preview-letterhead.use-case';
import { LetterheadResponseDto } from './dtos/letterhead-response.dto';
import { LetterheadDtoMapper } from './mappers/letterhead-dto.mapper';
import type { PageMargins } from 'src/domain/letterheads/domain/value-objects/page-margins';

const LetterheadPdfFilesInterceptor = FileFieldsInterceptor(
  [
    { name: 'firstPagePdf', maxCount: 1 },
    { name: 'continuationPagePdf', maxCount: 1 },
  ],
  { limits: { fileSize: 5 * 1024 * 1024 } },
);

interface UploadedFileFields {
  firstPagePdf?: Express.Multer.File[];
  continuationPagePdf?: Express.Multer.File[];
}

interface MarginsInput {
  top?: unknown;
  bottom?: unknown;
  left?: unknown;
  right?: unknown;
}

const MARGIN_KEYS: ReadonlyArray<keyof PageMargins> = [
  'top',
  'bottom',
  'left',
  'right',
];

function parseMargins(value: unknown, label: string): PageMargins {
  if (!value) {
    return { top: 20, bottom: 20, left: 20, right: 20 };
  }

  let parsed: unknown;
  try {
    parsed = typeof value === 'string' ? (JSON.parse(value) as unknown) : value;
  } catch {
    throw new BadRequestException(
      `Invalid ${label}: must be a JSON object with top, bottom, left, right`,
    );
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BadRequestException(
      `Invalid ${label}: must be a JSON object with top, bottom, left, right`,
    );
  }

  const values = parsed as MarginsInput;
  const margins: Record<string, number> = {};
  for (const key of MARGIN_KEYS) {
    const num = Number(values[key]);
    if (!Number.isFinite(num) || num < 0) {
      throw new BadRequestException(
        `Invalid ${label}: '${key}' must be a finite non-negative number, got '${String(values[key])}'`,
      );
    }
    margins[key] = num;
  }

  return margins as unknown as PageMargins;
}

@ApiTags('letterheads')
@Controller('letterheads')
export class LetterheadsController {
  private readonly logger = new Logger(LetterheadsController.name);

  constructor(
    private readonly createLetterheadUseCase: CreateLetterheadUseCase,
    private readonly findAllLetterheadsUseCase: FindAllLetterheadsUseCase,
    private readonly findLetterheadUseCase: FindLetterheadUseCase,
    private readonly updateLetterheadUseCase: UpdateLetterheadUseCase,
    private readonly deleteLetterheadUseCase: DeleteLetterheadUseCase,
    private readonly letterheadDtoMapper: LetterheadDtoMapper,
    private readonly downloadObjectUseCase: DownloadObjectUseCase,
    private readonly previewLetterheadUseCase: PreviewLetterheadUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @UseInterceptors(LetterheadPdfFilesInterceptor)
  @ApiOperation({ summary: 'Create a new letterhead' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'The letterhead has been created',
    type: LetterheadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(
    @Body() dto: CreateLetterheadDto,
    @UploadedFiles() files: UploadedFileFields,
  ): Promise<LetterheadResponseDto> {
    this.logger.log('create');

    const firstPageFile = files.firstPagePdf?.[0];
    if (!firstPageFile) {
      throw new BadRequestException('First page PDF file is required');
    }

    const letterhead = await this.createLetterheadUseCase.execute(
      new CreateLetterheadCommand({
        name: dto.name,
        fontFamily: dto.fontFamily,
        fontSizePt: dto.fontSizePt,
        description: dto.description,
        firstPagePdfBuffer: firstPageFile.buffer,
        continuationPagePdfBuffer:
          files.continuationPagePdf?.[0]?.buffer ?? null,
        firstPageMargins: parseMargins(
          dto.firstPageMargins,
          'firstPageMargins',
        ),
        continuationPageMargins: parseMargins(
          dto.continuationPageMargins,
          'continuationPageMargins',
        ),
      }),
    );
    return this.letterheadDtoMapper.toDto(letterhead);
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(LetterheadPdfFilesInterceptor)
  @ApiOperation({ summary: 'Render a sample letter with the draft letterhead' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: PreviewLetterheadDto })
  @ApiProduces('application/pdf')
  @ApiResponse({
    status: 200,
    description: 'The rendered sample letter',
    content: {
      'application/pdf': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid PDF or page margins' })
  @ApiResponse({
    status: 403,
    description: 'Organization administrator required',
  })
  @ApiResponse({ status: 404, description: 'Letterhead not found' })
  async preview(
    @Body() dto: PreviewLetterheadDto,
    @UploadedFiles() files: UploadedFileFields,
  ): Promise<StreamableFile> {
    const sample = await this.previewLetterheadUseCase.execute({
      letterheadId: dto.letterheadId,
      firstPagePdf: files.firstPagePdf?.[0]?.buffer,
      continuationPagePdf: files.continuationPagePdf?.[0]?.buffer,
      removeContinuationPage: dto.removeContinuationPage === 'true',
      firstPageMargins: parseMargins(dto.firstPageMargins, 'firstPageMargins'),
      continuationPageMargins: parseMargins(
        dto.continuationPageMargins,
        'continuationPageMargins',
      ),
      fontFamily: dto.fontFamily,
      fontSizePt: dto.fontSizePt,
      language: dto.language ?? 'de',
    });
    return new StreamableFile(sample, { type: 'application/pdf' });
  }

  @Get()
  @ApiOperation({ summary: 'List all letterheads for the current org' })
  @ApiResponse({
    status: 200,
    description: 'List of letterheads',
    type: [LetterheadResponseDto],
  })
  async findAll(): Promise<LetterheadResponseDto[]> {
    this.logger.log('findAll');
    const letterheads = await this.findAllLetterheadsUseCase.execute();
    return letterheads.map((l) => this.letterheadDtoMapper.toDto(l));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a letterhead by ID' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the letterhead',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'The letterhead',
    type: LetterheadResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Letterhead not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<LetterheadResponseDto> {
    this.logger.log({ id }, 'findOne');
    const letterhead = await this.findLetterheadUseCase.execute(
      new FindLetterheadQuery({ letterheadId: id }),
    );
    return this.letterheadDtoMapper.toDto(letterhead);
  }

  @Get(':id/first-page-pdf')
  @ApiOperation({ summary: 'Download the first-page PDF of a letterhead' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the letterhead',
    type: 'string',
    format: 'uuid',
  })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'The first-page PDF file' })
  @ApiResponse({ status: 404, description: 'Letterhead not found' })
  async downloadFirstPagePdf(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const letterhead = await this.findLetterheadUseCase.execute(
      new FindLetterheadQuery({ letterheadId: id }),
    );
    return this.streamPdf(res, letterhead.firstPageStoragePath, 'first-page');
  }

  @Get(':id/continuation-page-pdf')
  @ApiOperation({
    summary: 'Download the continuation-page PDF of a letterhead',
  })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the letterhead',
    type: 'string',
    format: 'uuid',
  })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'The continuation-page PDF file' })
  @ApiResponse({ status: 404, description: 'Letterhead or PDF not found' })
  async downloadContinuationPagePdf(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const letterhead = await this.findLetterheadUseCase.execute(
      new FindLetterheadQuery({ letterheadId: id }),
    );
    if (!letterhead.continuationPageStoragePath) {
      throw new NotFoundException(
        'This letterhead has no continuation page PDF',
      );
    }
    return this.streamPdf(
      res,
      letterhead.continuationPageStoragePath,
      'continuation-page',
    );
  }

  private async streamPdf(
    res: Response,
    storagePath: string,
    filename: string,
  ): Promise<StreamableFile> {
    const stream = await this.downloadObjectUseCase.execute(
      new DownloadObjectCommand(storagePath),
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}.pdf"`,
    });
    return new StreamableFile(stream as unknown as Readable);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(LetterheadPdfFilesInterceptor)
  @ApiOperation({ summary: 'Update a letterhead' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'id',
    description: 'The UUID of the letterhead',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'The updated letterhead',
    type: LetterheadResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Letterhead not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdateLetterheadDto,
    @UploadedFiles() files: UploadedFileFields,
  ): Promise<LetterheadResponseDto> {
    this.logger.log({ id }, 'update');

    const letterhead = await this.updateLetterheadUseCase.execute(
      this.toUpdateCommand(id, dto, files),
    );
    return this.letterheadDtoMapper.toDto(letterhead);
  }

  private toUpdateCommand(
    id: UUID,
    dto: UpdateLetterheadDto,
    files: UploadedFileFields,
  ): UpdateLetterheadCommand {
    const firstPageMargins = dto.firstPageMargins
      ? parseMargins(dto.firstPageMargins, 'firstPageMargins')
      : undefined;
    const continuationPageMargins = dto.continuationPageMargins
      ? parseMargins(dto.continuationPageMargins, 'continuationPageMargins')
      : undefined;
    return new UpdateLetterheadCommand({
      letterheadId: id,
      name: dto.name,
      fontFamily: dto.fontFamily,
      fontSizePt: dto.fontSizePt,
      description: dto.description,
      firstPagePdfBuffer: files.firstPagePdf?.[0]?.buffer,
      continuationPagePdfBuffer: files.continuationPagePdf?.[0]?.buffer,
      removeContinuationPage: dto.removeContinuationPage === 'true',
      firstPageMargins,
      continuationPageMargins,
    });
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a letterhead' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the letterhead',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ status: 204, description: 'Letterhead deleted' })
  @ApiResponse({ status: 404, description: 'Letterhead not found' })
  async remove(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    this.logger.log({ id }, 'delete');
    await this.deleteLetterheadUseCase.execute(
      new DeleteLetterheadCommand({ letterheadId: id }),
    );
  }
}
