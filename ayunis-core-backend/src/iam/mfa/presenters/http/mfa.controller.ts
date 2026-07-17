import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { RateLimit } from 'src/common/decorators/rate-limit.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { GetMfaStatusUseCase } from '../../application/use-cases/get-mfa-status/get-mfa-status.use-case';
import { GetMfaStatusQuery } from '../../application/use-cases/get-mfa-status/get-mfa-status.query';
import { SetupTotpUseCase } from '../../application/use-cases/setup-totp/setup-totp.use-case';
import { SetupTotpCommand } from '../../application/use-cases/setup-totp/setup-totp.command';
import { ConfirmTotpUseCase } from '../../application/use-cases/confirm-totp/confirm-totp.use-case';
import { ConfirmTotpCommand } from '../../application/use-cases/confirm-totp/confirm-totp.command';
import { DisableMfaUseCase } from '../../application/use-cases/disable-mfa/disable-mfa.use-case';
import { DisableMfaCommand } from '../../application/use-cases/disable-mfa/disable-mfa.command';
import { GetOrgMfaRequirementUseCase } from '../../application/use-cases/get-org-mfa-requirement/get-org-mfa-requirement.use-case';
import { GetOrgMfaRequirementQuery } from '../../application/use-cases/get-org-mfa-requirement/get-org-mfa-requirement.query';
import { UpsertOrgMfaRequirementUseCase } from '../../application/use-cases/upsert-org-mfa-requirement/upsert-org-mfa-requirement.use-case';
import { UpsertOrgMfaRequirementCommand } from '../../application/use-cases/upsert-org-mfa-requirement/upsert-org-mfa-requirement.command';
import { ResetUserMfaUseCase } from '../../application/use-cases/reset-user-mfa/reset-user-mfa.use-case';
import { ResetUserMfaCommand } from '../../application/use-cases/reset-user-mfa/reset-user-mfa.command';
import { MfaCodeRequestDto } from './dtos/mfa-code-request.dto';
import { MfaStatusResponseDto } from './dtos/mfa-status-response.dto';
import { MfaSetupResponseDto } from './dtos/mfa-setup-response.dto';
import { RecoveryCodesResponseDto } from './dtos/recovery-codes-response.dto';
import { OrgMfaRequirementResponseDto } from './dtos/org-mfa-requirement-response.dto';
import { UpdateOrgMfaRequirementRequestDto } from './dtos/update-org-mfa-requirement-request.dto';

@ApiTags('mfa')
@Controller('mfa')
export class MfaController {
  private readonly logger = new Logger(MfaController.name);

  constructor(
    private readonly getMfaStatusUseCase: GetMfaStatusUseCase,
    private readonly setupTotpUseCase: SetupTotpUseCase,
    private readonly confirmTotpUseCase: ConfirmTotpUseCase,
    private readonly disableMfaUseCase: DisableMfaUseCase,
    private readonly getOrgMfaRequirementUseCase: GetOrgMfaRequirementUseCase,
    private readonly upsertOrgMfaRequirementUseCase: UpsertOrgMfaRequirementUseCase,
    private readonly resetUserMfaUseCase: ResetUserMfaUseCase,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get the current user’s two-factor auth status' })
  @ApiResponse({ status: 200, type: MfaStatusResponseDto })
  async getStatus(
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<MfaStatusResponseDto> {
    return this.getMfaStatusUseCase.execute(new GetMfaStatusQuery(userId));
  }

  @Post('setup')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 5, windowMs: 15 * 60 * 1000 })
  @ApiOperation({
    summary: 'Start TOTP enrollment',
    description:
      'Generates a secret and QR code. Enrollment is pending until ' +
      'confirmed with a valid code.',
  })
  @ApiResponse({ status: 200, type: MfaSetupResponseDto })
  async setup(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.EMAIL) email: string,
  ): Promise<MfaSetupResponseDto> {
    this.logger.log('setup', { userId });
    return this.setupTotpUseCase.execute(new SetupTotpCommand(userId, email));
  }

  @Post('setup/confirm')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 10, windowMs: 15 * 60 * 1000 })
  @ApiOperation({
    summary: 'Confirm TOTP enrollment with a code',
    description: 'Activates two-factor auth and returns the recovery codes.',
  })
  @ApiResponse({ status: 200, type: RecoveryCodesResponseDto })
  async confirm(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() dto: MfaCodeRequestDto,
  ): Promise<RecoveryCodesResponseDto> {
    this.logger.log('confirm', { userId });
    const recoveryCodes = await this.confirmTotpUseCase.execute(
      new ConfirmTotpCommand(userId, dto.code),
    );
    return { recoveryCodes };
  }

  // POST rather than DELETE: the code travels in the body, and DELETE
  // request bodies may be stripped by proxies (RFC 9110 gives them no
  // defined semantics).
  @Post('disable')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 10, windowMs: 15 * 60 * 1000 })
  @ApiOperation({
    summary: 'Disable two-factor auth (requires a valid code)',
  })
  @ApiResponse({ status: 200, description: 'Two-factor auth disabled' })
  @ApiResponse({ status: 409, description: 'MFA is required by the org' })
  async disable(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Body() dto: MfaCodeRequestDto,
  ): Promise<{ success: boolean }> {
    this.logger.log('disable', { userId });
    await this.disableMfaUseCase.execute(
      new DisableMfaCommand(userId, orgId, dto.code),
    );
    return { success: true };
  }

  @Get('org')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get the org’s MFA requirement (admin)' })
  @ApiResponse({ status: 200, type: OrgMfaRequirementResponseDto })
  async getOrgRequirement(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<OrgMfaRequirementResponseDto> {
    const requirement = await this.getOrgMfaRequirementUseCase.execute(
      new GetOrgMfaRequirementQuery(orgId),
    );
    return { required: requirement.required };
  }

  @Put('org')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Set the org’s MFA requirement (admin)' })
  @ApiResponse({ status: 200, type: OrgMfaRequirementResponseDto })
  async updateOrgRequirement(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Body() dto: UpdateOrgMfaRequirementRequestDto,
  ): Promise<OrgMfaRequirementResponseDto> {
    this.logger.log('updateOrgRequirement', { orgId, required: dto.required });
    const requirement = await this.upsertOrgMfaRequirementUseCase.execute(
      new UpsertOrgMfaRequirementCommand(orgId, dto.required),
    );
    return { required: requirement.required };
  }

  @Delete('users/:userId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset a user’s two-factor auth (admin, lockout recovery)',
  })
  @ApiResponse({ status: 200, description: 'Two-factor auth reset' })
  async resetUser(
    @Param('userId', ParseUUIDPipe) targetUserId: UUID,
  ): Promise<{ success: boolean }> {
    this.logger.log('resetUser', { targetUserId });
    await this.resetUserMfaUseCase.execute(
      new ResetUserMfaCommand(targetUserId),
    );
    return { success: true };
  }
}
