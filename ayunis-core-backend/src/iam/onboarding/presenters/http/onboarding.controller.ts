import {
  Controller,
  Get,
  Put,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { GetOnboardingUseCase } from '../../application/use-cases/get-onboarding/get-onboarding.use-case';
import { GetOnboardingQuery } from '../../application/use-cases/get-onboarding/get-onboarding.query';
import { UpdateOnboardingUseCase } from '../../application/use-cases/update-onboarding/update-onboarding.use-case';
import { UpdateOnboardingCommand } from '../../application/use-cases/update-onboarding/update-onboarding.command';
import { UpdateOnboardingDto } from './dtos/update-onboarding.dto';
import { OnboardingResponseDto } from './dtos/onboarding-response.dto';
import { OnboardingResponseDtoMapper } from './mappers/onboarding-response-dto.mapper';

@ApiTags('Onboarding')
@Controller('onboarding')
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(
    private readonly getOnboardingUseCase: GetOnboardingUseCase,
    private readonly updateOnboardingUseCase: UpdateOnboardingUseCase,
    private readonly onboardingResponseDtoMapper: OnboardingResponseDtoMapper,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get onboarding progress',
    description:
      "Get the current user's onboarding progress: the IDs of completed steps and whether the checklist is hidden.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Onboarding progress',
    type: OnboardingResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while reading onboarding',
  })
  async getOnboarding(
    @CurrentUser(UserProperty.ID) currentUserId: UUID,
  ): Promise<OnboardingResponseDto> {
    this.logger.log('getOnboarding');

    const onboarding = await this.getOnboardingUseCase.execute(
      new GetOnboardingQuery(currentUserId),
    );

    return this.onboardingResponseDtoMapper.toDto(onboarding);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update onboarding progress',
    description:
      "Persist the current user's onboarding progress: the IDs of completed steps and whether the checklist is hidden.",
  })
  @ApiBody({
    type: UpdateOnboardingDto,
    description: 'Onboarding progress to persist',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Onboarding progress successfully updated',
    type: OnboardingResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid onboarding payload' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while updating onboarding',
  })
  async updateOnboarding(
    @Body() updateOnboardingDto: UpdateOnboardingDto,
    @CurrentUser(UserProperty.ID) currentUserId: UUID,
  ): Promise<OnboardingResponseDto> {
    this.logger.log('updateOnboarding', {
      completedStepIdsCount: updateOnboardingDto.completedStepIds.length,
      hidden: updateOnboardingDto.hidden,
    });

    const onboarding = await this.updateOnboardingUseCase.execute(
      new UpdateOnboardingCommand(
        currentUserId,
        updateOnboardingDto.completedStepIds,
        updateOnboardingDto.hidden,
      ),
    );

    return this.onboardingResponseDtoMapper.toDto(onboarding);
  }
}
