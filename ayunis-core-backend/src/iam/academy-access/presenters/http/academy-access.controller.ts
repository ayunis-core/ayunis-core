import { Body, Controller, Get, HttpStatus, Logger, Put } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { EvaluateAcademyAccessUseCase } from '../../application/use-cases/evaluate-academy-access/evaluate-academy-access.use-case';
import { EvaluateAcademyAccessQuery } from '../../application/use-cases/evaluate-academy-access/evaluate-academy-access.query';
import { GetOrgAcademyAccessSettingsUseCase } from '../../application/use-cases/get-org-academy-access-settings/get-org-academy-access-settings.use-case';
import { GetOrgAcademyAccessSettingsQuery } from '../../application/use-cases/get-org-academy-access-settings/get-org-academy-access-settings.query';
import { UpsertOrgAcademyAccessSettingsUseCase } from '../../application/use-cases/upsert-org-academy-access-settings/upsert-org-academy-access-settings.use-case';
import { UpsertOrgAcademyAccessSettingsCommand } from '../../application/use-cases/upsert-org-academy-access-settings/upsert-org-academy-access-settings.command';
import { AcademyAccessStatusResponseDto } from './dto/academy-access-status-response.dto';
import { OrgAcademyAccessSettingsResponseDto } from './dto/org-academy-access-settings-response.dto';
import { UpsertOrgAcademyAccessSettingsDto } from './dto/upsert-org-academy-access-settings.dto';

@ApiTags('Academy Access')
@Controller('academy-access')
export class AcademyAccessController {
  private readonly logger = new Logger(AcademyAccessController.name);

  constructor(
    private readonly evaluateAcademyAccessUseCase: EvaluateAcademyAccessUseCase,
    private readonly getOrgSettingsUseCase: GetOrgAcademyAccessSettingsUseCase,
    private readonly upsertOrgSettingsUseCase: UpsertOrgAcademyAccessSettingsUseCase,
  ) {}

  /**
   * Deliberately not gated — a blocked user has to be able to read why they are
   * blocked.
   */
  @Get('status')
  @ApiOperation({
    summary: 'Whether the current user may use Ayunis Core chat, and why not',
  })
  @ApiResponse({ status: HttpStatus.OK, type: AcademyAccessStatusResponseDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async getStatus(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<AcademyAccessStatusResponseDto> {
    return this.evaluateAcademyAccessUseCase.execute(
      new EvaluateAcademyAccessQuery(userId, orgId),
    );
  }

  @Get('org-settings')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get the org's academy certificate requirement" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OrgAcademyAccessSettingsResponseDto,
  })
  async getOrgSettings(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<OrgAcademyAccessSettingsResponseDto> {
    const settings = await this.getOrgSettingsUseCase.execute(
      new GetOrgAcademyAccessSettingsQuery(orgId),
    );
    return { mode: settings.mode };
  }

  @Put('org-settings')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Set the org's academy certificate requirement" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OrgAcademyAccessSettingsResponseDto,
  })
  async upsertOrgSettings(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Body() dto: UpsertOrgAcademyAccessSettingsDto,
  ): Promise<OrgAcademyAccessSettingsResponseDto> {
    this.logger.log('upsertOrgSettings', { orgId, mode: dto.mode });

    const settings = await this.upsertOrgSettingsUseCase.execute(
      new UpsertOrgAcademyAccessSettingsCommand(orgId, dto.mode),
    );
    return { mode: settings.mode };
  }
}
