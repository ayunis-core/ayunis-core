import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type { UUID } from 'crypto';
import {
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
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
import { RecordModuleHeartbeatCommand } from 'src/domain/academy/application/use-cases/record-module-heartbeat/record-module-heartbeat.command';
import { RecordModuleHeartbeatUseCase } from 'src/domain/academy/application/use-cases/record-module-heartbeat/record-module-heartbeat.use-case';
import { AcademyProgressResponseDto } from './dto/academy-progress-response.dto';
import { RecordModuleHeartbeatRequestDto } from './dto/record-module-heartbeat-request.dto';
import { AcademyResponseDtoMapper } from './mappers/academy-response-dto.mapper';

@ApiTags('Academy')
@Controller('academy')
@RequireAddon(AddonType.AYUNIS_CORE_ACADEMY)
export class AcademyProgressController {
  private readonly logger = new Logger(AcademyProgressController.name);

  constructor(
    private readonly getAcademyProgressUseCase: GetAcademyProgressUseCase,
    private readonly recordModuleHeartbeatUseCase: RecordModuleHeartbeatUseCase,
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
    this.logger.log({ userId }, 'Getting academy progress');
    const progress = await this.getAcademyProgressUseCase.execute(
      new GetAcademyProgressQuery({ userId }),
    );
    return this.responseMapper.progressToDto(progress);
  }

  @Post('course-modules/:courseModuleId/heartbeat')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Record time on a course module page',
    description:
      'Sent periodically while the video page is visible. The server credits the time since the previous heartbeat, capped at one heartbeat interval.',
  })
  @ApiParam({ name: 'courseModuleId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Heartbeat recorded' })
  @ApiNotFoundResponse({ description: 'Course module not found' })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or academy add-on not active',
  })
  async recordModuleHeartbeat(
    @Param('courseModuleId', ParseUUIDPipe) courseModuleId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() dto: RecordModuleHeartbeatRequestDto,
  ): Promise<void> {
    await this.recordModuleHeartbeatUseCase.execute(
      new RecordModuleHeartbeatCommand({
        userId,
        courseModuleId,
        sessionStart: dto.sessionStart,
      }),
    );
  }
}
