import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { RequireUsageBasedSubscription } from 'src/iam/authorization/application/decorators/usage-based-subscription.decorator';
import { GetApiKeyCreditLimitsOverviewUseCase } from 'src/iam/credit-limits/application/use-cases/get-api-key-credit-limits-overview/get-api-key-credit-limits-overview.use-case';
import { GetTeamCreditLimitsOverviewUseCase } from 'src/iam/credit-limits/application/use-cases/get-team-credit-limits-overview/get-team-credit-limits-overview.use-case';
import { GetUserCreditLimitsOverviewUseCase } from 'src/iam/credit-limits/application/use-cases/get-user-credit-limits-overview/get-user-credit-limits-overview.use-case';
import { RemoveApiKeyCreditLimitCommand } from 'src/iam/credit-limits/application/use-cases/remove-api-key-credit-limit/remove-api-key-credit-limit.command';
import { RemoveApiKeyCreditLimitUseCase } from 'src/iam/credit-limits/application/use-cases/remove-api-key-credit-limit/remove-api-key-credit-limit.use-case';
import { RemoveTeamCreditLimitCommand } from 'src/iam/credit-limits/application/use-cases/remove-team-credit-limit/remove-team-credit-limit.command';
import { RemoveTeamCreditLimitUseCase } from 'src/iam/credit-limits/application/use-cases/remove-team-credit-limit/remove-team-credit-limit.use-case';
import { RemoveUserCreditLimitCommand } from 'src/iam/credit-limits/application/use-cases/remove-user-credit-limit/remove-user-credit-limit.command';
import { RemoveUserCreditLimitUseCase } from 'src/iam/credit-limits/application/use-cases/remove-user-credit-limit/remove-user-credit-limit.use-case';
import { SetApiKeyCreditLimitCommand } from 'src/iam/credit-limits/application/use-cases/set-api-key-credit-limit/set-api-key-credit-limit.command';
import { SetApiKeyCreditLimitUseCase } from 'src/iam/credit-limits/application/use-cases/set-api-key-credit-limit/set-api-key-credit-limit.use-case';
import { SetTeamCreditLimitCommand } from 'src/iam/credit-limits/application/use-cases/set-team-credit-limit/set-team-credit-limit.command';
import { SetTeamCreditLimitUseCase } from 'src/iam/credit-limits/application/use-cases/set-team-credit-limit/set-team-credit-limit.use-case';
import { SetUserCreditLimitCommand } from 'src/iam/credit-limits/application/use-cases/set-user-credit-limit/set-user-credit-limit.command';
import { SetUserCreditLimitUseCase } from 'src/iam/credit-limits/application/use-cases/set-user-credit-limit/set-user-credit-limit.use-case';
import {
  ApiKeyCreditLimitItemDto,
  TeamCreditLimitItemDto,
  UserCreditLimitItemDto,
} from 'src/iam/credit-limits/presenters/http/dtos/credit-limit-item.dto';
import {
  ApiKeyCreditLimitResponseDto,
  TeamCreditLimitResponseDto,
  UserCreditLimitResponseDto,
} from 'src/iam/credit-limits/presenters/http/dtos/credit-limit-response.dto';
import { SetCreditLimitDto } from './dtos/set-credit-limit.dto';
import { CreditLimitDtoMapper } from './mappers/credit-limit-dto.mapper';

@ApiTags('credit-limits')
@Controller('credit-limits')
@RequireUsageBasedSubscription()
export class CreditLimitsController {
  private readonly logger = new Logger(CreditLimitsController.name);

  constructor(
    private readonly getUserCreditLimitsOverviewUseCase: GetUserCreditLimitsOverviewUseCase,
    private readonly getTeamCreditLimitsOverviewUseCase: GetTeamCreditLimitsOverviewUseCase,
    private readonly getApiKeyCreditLimitsOverviewUseCase: GetApiKeyCreditLimitsOverviewUseCase,
    private readonly setUserCreditLimitUseCase: SetUserCreditLimitUseCase,
    private readonly setTeamCreditLimitUseCase: SetTeamCreditLimitUseCase,
    private readonly setApiKeyCreditLimitUseCase: SetApiKeyCreditLimitUseCase,
    private readonly removeUserCreditLimitUseCase: RemoveUserCreditLimitUseCase,
    private readonly removeTeamCreditLimitUseCase: RemoveTeamCreditLimitUseCase,
    private readonly removeApiKeyCreditLimitUseCase: RemoveApiKeyCreditLimitUseCase,
    private readonly mapper: CreditLimitDtoMapper,
  ) {}

  @Roles(UserRole.ADMIN)
  @Get('users')
  @ApiOperation({
    summary: 'List configured user credit limits with current consumption',
  })
  @ApiResponse({ status: 200, type: [UserCreditLimitItemDto] })
  async getUserLimits(): Promise<UserCreditLimitItemDto[]> {
    this.logger.log('Getting user credit limits');
    const items = await this.getUserCreditLimitsOverviewUseCase.execute();
    return this.mapper.toUserItems(items);
  }

  @Roles(UserRole.ADMIN)
  @Get('teams')
  @ApiOperation({
    summary: 'List configured team credit limits with current consumption',
  })
  @ApiResponse({ status: 200, type: [TeamCreditLimitItemDto] })
  async getTeamLimits(): Promise<TeamCreditLimitItemDto[]> {
    this.logger.log('Getting team credit limits');
    const items = await this.getTeamCreditLimitsOverviewUseCase.execute();
    return this.mapper.toTeamItems(items);
  }

  @Roles(UserRole.ADMIN)
  @Get('api-keys')
  @ApiOperation({
    summary: 'List configured API key credit limits with current consumption',
  })
  @ApiResponse({ status: 200, type: [ApiKeyCreditLimitItemDto] })
  async getApiKeyLimits(): Promise<ApiKeyCreditLimitItemDto[]> {
    this.logger.log('Getting API key credit limits');
    const items = await this.getApiKeyCreditLimitsOverviewUseCase.execute();
    return this.mapper.toApiKeyItems(items);
  }

  @Roles(UserRole.ADMIN)
  @Put('users/:userId')
  @ApiOperation({ summary: 'Set a monthly credit limit for a user' })
  @ApiResponse({ status: 200, type: UserCreditLimitResponseDto })
  async setUserLimit(
    @Param('userId', ParseUUIDPipe) userId: UUID,
    @Body() dto: SetCreditLimitDto,
  ): Promise<UserCreditLimitResponseDto> {
    this.logger.log({ userId }, 'Setting credit limit for user');
    const limit = await this.setUserCreditLimitUseCase.execute(
      new SetUserCreditLimitCommand(userId, dto.monthlyCredits),
    );
    return this.mapper.toUserDto(limit);
  }

  @Roles(UserRole.ADMIN)
  @Put('teams/:teamId')
  @ApiOperation({ summary: 'Set a monthly credit limit for a team' })
  @ApiResponse({ status: 200, type: TeamCreditLimitResponseDto })
  async setTeamLimit(
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
    @Body() dto: SetCreditLimitDto,
  ): Promise<TeamCreditLimitResponseDto> {
    this.logger.log({ teamId }, 'Setting credit limit for team');
    const limit = await this.setTeamCreditLimitUseCase.execute(
      new SetTeamCreditLimitCommand(teamId, dto.monthlyCredits),
    );
    return this.mapper.toTeamDto(limit);
  }

  @Roles(UserRole.ADMIN)
  @Put('api-keys/:apiKeyId')
  @ApiOperation({ summary: 'Set a monthly credit limit for an API key' })
  @ApiResponse({ status: 200, type: ApiKeyCreditLimitResponseDto })
  async setApiKeyLimit(
    @Param('apiKeyId', ParseUUIDPipe) apiKeyId: UUID,
    @Body() dto: SetCreditLimitDto,
  ): Promise<ApiKeyCreditLimitResponseDto> {
    this.logger.log({ apiKeyId }, 'Setting credit limit for API key');
    const limit = await this.setApiKeyCreditLimitUseCase.execute(
      new SetApiKeyCreditLimitCommand(apiKeyId, dto.monthlyCredits),
    );
    return this.mapper.toApiKeyDto(limit);
  }

  @Roles(UserRole.ADMIN)
  @Delete('users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a user credit limit (back to unlimited)' })
  @ApiResponse({ status: 204 })
  async removeUserLimit(
    @Param('userId', ParseUUIDPipe) userId: UUID,
  ): Promise<void> {
    this.logger.log({ userId }, 'Removing credit limit for user');
    await this.removeUserCreditLimitUseCase.execute(
      new RemoveUserCreditLimitCommand(userId),
    );
  }

  @Roles(UserRole.ADMIN)
  @Delete('api-keys/:apiKeyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an API key credit limit' })
  @ApiResponse({ status: 204 })
  async removeApiKeyLimit(
    @Param('apiKeyId', ParseUUIDPipe) apiKeyId: UUID,
  ): Promise<void> {
    this.logger.log({ apiKeyId }, 'Removing credit limit for API key');
    await this.removeApiKeyCreditLimitUseCase.execute(
      new RemoveApiKeyCreditLimitCommand(apiKeyId),
    );
  }

  @Roles(UserRole.ADMIN)
  @Delete('teams/:teamId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a team credit limit (back to unlimited)' })
  @ApiResponse({ status: 204 })
  async removeTeamLimit(
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
  ): Promise<void> {
    this.logger.log({ teamId }, 'Removing credit limit for team');
    await this.removeTeamCreditLimitUseCase.execute(
      new RemoveTeamCreditLimitCommand(teamId),
    );
  }
}
