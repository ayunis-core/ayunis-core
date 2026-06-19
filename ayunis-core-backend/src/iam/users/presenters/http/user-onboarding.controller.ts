import {
  Controller,
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
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from '../../../authentication/application/decorators/current-user.decorator';
import { UpdateUserOnboardingUseCase } from '../../application/use-cases/update-user-onboarding/update-user-onboarding.use-case';
import { UpdateUserOnboardingCommand } from '../../application/use-cases/update-user-onboarding/update-user-onboarding.command';
import { UpdateUserOnboardingDto } from './dtos/update-user-onboarding.dto';
import { UserResponseDtoMapper } from './mappers/user-response-dto.mapper';
import { UserResponseDto } from './dtos/user-response.dto';

@ApiTags('Users')
@Controller('users')
export class UserOnboardingController {
  private readonly logger = new Logger(UserOnboardingController.name);

  constructor(
    private readonly updateUserOnboardingUseCase: UpdateUserOnboardingUseCase,
    private readonly userResponseDtoMapper: UserResponseDtoMapper,
  ) {}

  @Put('me/onboarding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update onboarding progress',
    description:
      "Persist the current user's onboarding progress: the IDs of completed steps and whether the checklist is hidden.",
  })
  @ApiBody({
    type: UpdateUserOnboardingDto,
    description: 'Onboarding progress to persist',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Onboarding progress successfully updated',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid onboarding payload' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while updating onboarding',
  })
  async updateUserOnboarding(
    @Body() updateUserOnboardingDto: UpdateUserOnboardingDto,
    @CurrentUser(UserProperty.ID) currentUserId: UUID,
  ): Promise<UserResponseDto> {
    this.logger.log('updateUserOnboarding', {
      completedStepIdsCount: updateUserOnboardingDto.completedStepIds.length,
      hidden: updateUserOnboardingDto.hidden,
    });

    const updatedUser = await this.updateUserOnboardingUseCase.execute(
      new UpdateUserOnboardingCommand(
        currentUserId,
        updateUserOnboardingDto.completedStepIds,
        updateUserOnboardingDto.hidden,
      ),
    );

    return this.userResponseDtoMapper.toDto(updatedUser);
  }
}
