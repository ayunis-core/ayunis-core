import { Body, Controller, Get, HttpStatus, Put, Query } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
import { ListOrgCertificateStatusesUseCase } from 'src/iam/academy-access/application/use-cases/list-org-certificate-statuses/list-org-certificate-statuses.use-case';
import { ListOrgCertificateStatusesQuery } from 'src/iam/academy-access/application/use-cases/list-org-certificate-statuses/list-org-certificate-statuses.query';
import { AcademyAccessStatusResponseDto } from './dto/academy-access-status-response.dto';
import { OrgAcademyAccessSettingsResponseDto } from './dto/org-academy-access-settings-response.dto';
import { UpsertOrgAcademyAccessSettingsDto } from './dto/upsert-org-academy-access-settings.dto';
import { OrgCertificateStatusesQueryParamsDto } from './dto/org-certificate-statuses-query-params.dto';
import { PaginatedOrgCertificateStatusesResponseDto } from './dto/org-certificate-status-response.dto';

@ApiTags('Academy Access')
@Controller('academy-access')
export class AcademyAccessController {
  constructor(
    @InjectPinoLogger(AcademyAccessController.name)
    private readonly logger: PinoLogger,
    private readonly evaluateAcademyAccessUseCase: EvaluateAcademyAccessUseCase,
    private readonly getOrgSettingsUseCase: GetOrgAcademyAccessSettingsUseCase,
    private readonly upsertOrgSettingsUseCase: UpsertOrgAcademyAccessSettingsUseCase,
    private readonly listOrgCertificateStatusesUseCase: ListOrgCertificateStatusesUseCase,
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
    this.logger.info({ orgId, mode: dto.mode }, 'upsertOrgSettings');

    const settings = await this.upsertOrgSettingsUseCase.execute(
      new UpsertOrgAcademyAccessSettingsCommand(orgId, dto.mode),
    );
    return { mode: settings.mode };
  }

  @Get('org-certificates')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: "Certificate standing of every member of the admin's org",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PaginatedOrgCertificateStatusesResponseDto,
  })
  async listOrgCertificates(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Query() queryParams: OrgCertificateStatusesQueryParamsDto,
  ): Promise<PaginatedOrgCertificateStatusesResponseDto> {
    // The search term is free text over member names and emails, so it is
    // counted rather than logged — it would otherwise persist personal data in
    // centralized logs for their whole retention period.
    this.logger.info(
      {
        orgId,
        status: queryParams.status,
        limit: queryParams.limit,
        offset: queryParams.offset,
        hasSearch: queryParams.search !== undefined,
      },
      'listOrgCertificates',
    );

    const statuses = await this.listOrgCertificateStatusesUseCase.execute(
      new ListOrgCertificateStatusesQuery({
        orgId,
        search: queryParams.search,
        status: queryParams.status,
        pagination: {
          limit: queryParams.limit,
          offset: queryParams.offset,
        },
      }),
    );

    return {
      data: statuses.data.map((entry) => ({ ...entry })),
      pagination: {
        limit: statuses.limit,
        offset: statuses.offset,
        total: statuses.total,
      },
    };
  }
}
