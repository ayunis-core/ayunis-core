import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAddon } from 'src/iam/authorization/application/decorators/addon.decorator';
import { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { GetAcademyProgressQuery } from 'src/domain/academy/application/use-cases/get-academy-progress/get-academy-progress.query';
import { GetAcademyProgressUseCase } from 'src/domain/academy/application/use-cases/get-academy-progress/get-academy-progress.use-case';
import { AcademyProgressResponseDto } from './dto/academy-progress-response.dto';
import { AcademyResponseDtoMapper } from './mappers/academy-response-dto.mapper';

@ApiTags('Academy')
@Controller('academy')
@RequireAddon(AddonType.AYUNIS_CORE_ACADEMY)
export class AcademyProgressController {
  constructor(
    @InjectPinoLogger(AcademyProgressController.name)
    private readonly logger: PinoLogger,
    private readonly getAcademyProgressUseCase: GetAcademyProgressUseCase,
    private readonly responseMapper: AcademyResponseDtoMapper,
  ) {}

  @Get('progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get academy progress',
    description:
      'Get the current user chapter confirmations and whole-academy completion date.',
  })
  @ApiOkResponse({ type: AcademyProgressResponseDto })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or academy add-on not active',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getProgress(
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<AcademyProgressResponseDto> {
    this.logger.info({ userId }, 'Getting academy progress');
    const progress = await this.getAcademyProgressUseCase.execute(
      new GetAcademyProgressQuery({ userId }),
    );
    return this.responseMapper.progressToDto(progress);
  }
}
