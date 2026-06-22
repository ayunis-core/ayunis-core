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
import { GetUserCreditLimitsOverviewUseCase } from '../../application/use-cases/get-user-credit-limits-overview/get-user-credit-limits-overview.use-case';
import { GetTeamCreditLimitsOverviewUseCase } from '../../application/use-cases/get-team-credit-limits-overview/get-team-credit-limits-overview.use-case';
import { SetUserCreditLimitUseCase } from '../../application/use-cases/set-user-credit-limit/set-user-credit-limit.use-case';
import { SetUserCreditLimitCommand } from '../../application/use-cases/set-user-credit-limit/set-user-credit-limit.command';
import { SetTeamCreditLimitUseCase } from '../../application/use-cases/set-team-credit-limit/set-team-credit-limit.use-case';
import { SetTeamCreditLimitCommand } from '../../application/use-cases/set-team-credit-limit/set-team-credit-limit.command';
import { RemoveUserCreditLimitUseCase } from '../../application/use-cases/remove-user-credit-limit/remove-user-credit-limit.use-case';
import { RemoveUserCreditLimitCommand } from '../../application/use-cases/remove-user-credit-limit/remove-user-credit-limit.command';
import { RemoveTeamCreditLimitUseCase } from '../../application/use-cases/remove-team-credit-limit/remove-team-credit-limit.use-case';
import { RemoveTeamCreditLimitCommand } from '../../application/use-cases/remove-team-credit-limit/remove-team-credit-limit.command';
import { SetCreditLimitDto } from './dtos/set-credit-limit.dto';
import { CreditLimitResponseDto } from './dtos/credit-limit-response.dto';
import {
  UserCreditLimitItemDto,
  TeamCreditLimitItemDto,
} from './dtos/credit-limit-item.dto';
import { CreditLimitDtoMapper } from './mappers/credit-limit-dto.mapper';

@ApiTags('credit-limits')
@Controller('credit-limits')
export class CreditLimitsController {
  private readonly logger = new Logger(CreditLimitsController.name);

  constructor(
    private readonly getUserCreditLimitsOverviewUseCase: GetUserCreditLimitsOverviewUseCase,
    private readonly getTeamCreditLimitsOverviewUseCase: GetTeamCreditLimitsOverviewUseCase,
    private readonly setUserCreditLimitUseCase: SetUserCreditLimitUseCase,
    private readonly setTeamCreditLimitUseCase: SetTeamCreditLimitUseCase,
    private readonly removeUserCreditLimitUseCase: RemoveUserCreditLimitUseCase,
    private readonly removeTeamCreditLimitUseCase: RemoveTeamCreditLimitUseCase,
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
  @Put('users/:userId')
  @ApiOperation({ summary: 'Set a monthly credit limit for a user' })
  @ApiResponse({ status: 200, type: CreditLimitResponseDto })
  async setUserLimit(
    @Param('userId', ParseUUIDPipe) userId: UUID,
    @Body() dto: SetCreditLimitDto,
  ): Promise<CreditLimitResponseDto> {
    this.logger.log(`Setting credit limit for user ${userId}`);
    const limit = await this.setUserCreditLimitUseCase.execute(
      new SetUserCreditLimitCommand(userId, dto.monthlyCredits),
    );
    return this.mapper.toDto(limit);
  }

  @Roles(UserRole.ADMIN)
  @Put('teams/:teamId')
  @ApiOperation({ summary: 'Set a monthly credit limit for a team' })
  @ApiResponse({ status: 200, type: CreditLimitResponseDto })
  async setTeamLimit(
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
    @Body() dto: SetCreditLimitDto,
  ): Promise<CreditLimitResponseDto> {
    this.logger.log(`Setting credit limit for team ${teamId}`);
    const limit = await this.setTeamCreditLimitUseCase.execute(
      new SetTeamCreditLimitCommand(teamId, dto.monthlyCredits),
    );
    return this.mapper.toDto(limit);
  }

  @Roles(UserRole.ADMIN)
  @Delete('users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a user credit limit (back to unlimited)' })
  @ApiResponse({ status: 204 })
  async removeUserLimit(
    @Param('userId', ParseUUIDPipe) userId: UUID,
  ): Promise<void> {
    this.logger.log(`Removing credit limit for user ${userId}`);
    await this.removeUserCreditLimitUseCase.execute(
      new RemoveUserCreditLimitCommand(userId),
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
    this.logger.log(`Removing credit limit for team ${teamId}`);
    await this.removeTeamCreditLimitUseCase.execute(
      new RemoveTeamCreditLimitCommand(teamId),
    );
  }
}
