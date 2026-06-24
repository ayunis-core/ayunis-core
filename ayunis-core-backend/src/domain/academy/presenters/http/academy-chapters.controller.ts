import { Controller, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAddon } from 'src/iam/authorization/application/decorators/addon.decorator';
import { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';
import { GetAcademyContentUseCase } from '../../application/use-cases/get-academy-content/get-academy-content.use-case';
import { GetAcademyContentQuery } from '../../application/use-cases/get-academy-content/get-academy-content.query';
import { AcademyChapterResponseDto } from './dto/academy-chapter-response.dto';
import { AcademyResponseDtoMapper } from './mappers/academy-response-dto.mapper';

@ApiTags('Academy')
@Controller('academy/chapters')
@RequireAddon(AddonType.AYUNIS_CORE_ACADEMY)
export class AcademyChaptersController {
  private readonly logger = new Logger(AcademyChaptersController.name);

  constructor(
    private readonly getAcademyContentUseCase: GetAcademyContentUseCase,
    private readonly responseMapper: AcademyResponseDtoMapper,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all academy chapters with their lessons',
    description:
      'Retrieve all chapters with nested lessons, ordered by position. Requires the academy add-on to be active for the organization.',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved academy chapters',
    type: [AcademyChapterResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or academy add-on not active',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getChapters(): Promise<AcademyChapterResponseDto[]> {
    this.logger.log('Getting academy chapters');
    const chapters = await this.getAcademyContentUseCase.execute(
      new GetAcademyContentQuery(),
    );
    return this.responseMapper.chapterToDtoArray(chapters);
  }
}
