import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAddon } from 'src/iam/authorization/application/decorators/addon.decorator';
import { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { ConfirmChapterCommand } from 'src/domain/academy/application/use-cases/confirm-chapter/confirm-chapter.command';
import { ConfirmChapterUseCase } from 'src/domain/academy/application/use-cases/confirm-chapter/confirm-chapter.use-case';
import { GetAcademyContentQuery } from 'src/domain/academy/application/use-cases/get-academy-content/get-academy-content.query';
import { GetAcademyContentUseCase } from 'src/domain/academy/application/use-cases/get-academy-content/get-academy-content.use-case';
import { AcademyChapterResponseDto } from './dto/academy-chapter-response.dto';
import { ChapterConfirmationResponseDto } from './dto/chapter-confirmation-response.dto';
import { AcademyResponseDtoMapper } from './mappers/academy-response-dto.mapper';

@ApiTags('Academy')
@Controller('academy/chapters')
@RequireAddon(AddonType.AYUNIS_CORE_ACADEMY)
export class AcademyChaptersController {
  constructor(
    @InjectPinoLogger(AcademyChaptersController.name)
    private readonly logger: PinoLogger,
    private readonly getAcademyContentUseCase: GetAcademyContentUseCase,
    private readonly confirmChapterUseCase: ConfirmChapterUseCase,
    private readonly responseMapper: AcademyResponseDtoMapper,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all academy chapters with their modules',
    description:
      'Retrieve all chapters with nested modules, ordered by position. Requires the academy add-on to be active for the organization.',
  })
  @ApiOkResponse({ type: [AcademyChapterResponseDto] })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or academy add-on not active',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getChapters(): Promise<AcademyChapterResponseDto[]> {
    this.logger.info('Getting academy chapters');
    const chapters = await this.getAcademyContentUseCase.execute(
      new GetAcademyContentQuery(),
    );
    return this.responseMapper.chapterToDtoArray(chapters);
  }

  @Post(':chapterId/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm an academy chapter',
    description:
      'Confirm that the current user watched all videos in the chapter. Reconfirmation refreshes the confirmation date.',
  })
  @ApiParam({ name: 'chapterId', format: 'uuid' })
  @ApiOkResponse({ type: ChapterConfirmationResponseDto })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or academy add-on not active',
  })
  async confirmChapter(
    @Param('chapterId', ParseUUIDPipe) chapterId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<ChapterConfirmationResponseDto> {
    this.logger.info({ chapterId, userId }, 'Confirming academy chapter');
    const result = await this.confirmChapterUseCase.execute(
      new ConfirmChapterCommand({ userId, chapterId }),
    );
    return this.responseMapper.confirmationToDto(result);
  }
}
