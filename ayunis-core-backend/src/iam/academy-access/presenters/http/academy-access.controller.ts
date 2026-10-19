import {
  Body,
  Controller,
  Get,
  Header,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiTooManyRequestsResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import type { Response } from 'express';
import { RateLimit } from 'src/common/decorators/rate-limit.decorator';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { EvaluateAcademyAccessUseCase } from 'src/iam/academy-access/application/use-cases/evaluate-academy-access/evaluate-academy-access.use-case';
import { EvaluateAcademyAccessQuery } from 'src/iam/academy-access/application/use-cases/evaluate-academy-access/evaluate-academy-access.query';
import { GetOrgAcademyAccessSettingsUseCase } from 'src/iam/academy-access/application/use-cases/get-org-academy-access-settings/get-org-academy-access-settings.use-case';
import { GetOrgAcademyAccessSettingsQuery } from 'src/iam/academy-access/application/use-cases/get-org-academy-access-settings/get-org-academy-access-settings.query';
import { UpsertOrgAcademyAccessSettingsUseCase } from 'src/iam/academy-access/application/use-cases/upsert-org-academy-access-settings/upsert-org-academy-access-settings.use-case';
import { UpsertOrgAcademyAccessSettingsCommand } from 'src/iam/academy-access/application/use-cases/upsert-org-academy-access-settings/upsert-org-academy-access-settings.command';
import { ListOrgCertificateStatusesUseCase } from 'src/iam/academy-access/application/use-cases/list-org-certificate-statuses/list-org-certificate-statuses.use-case';
import { ListOrgCertificateStatusesQuery } from 'src/iam/academy-access/application/use-cases/list-org-certificate-statuses/list-org-certificate-statuses.query';
import {
  CERTIFICATE_OVERVIEW_EXPORT_FILE_NAME,
  ExportOrgCertificateStatusesUseCase,
} from 'src/iam/academy-access/application/use-cases/export-org-certificate-statuses/export-org-certificate-statuses.use-case';
import { ExportOrgCertificateStatusesQuery } from 'src/iam/academy-access/application/use-cases/export-org-certificate-statuses/export-org-certificate-statuses.query';
import { GetOrgMemberCertificateUseCase } from 'src/iam/academy-access/application/use-cases/get-org-member-certificate/get-org-member-certificate.use-case';
import { GetOrgMemberCertificateQuery } from 'src/iam/academy-access/application/use-cases/get-org-member-certificate/get-org-member-certificate.query';
import { AcademyAccessStatusResponseDto } from './dto/academy-access-status-response.dto';
import { OrgAcademyAccessSettingsResponseDto } from './dto/org-academy-access-settings-response.dto';
import { UpsertOrgAcademyAccessSettingsDto } from './dto/upsert-org-academy-access-settings.dto';
import { OrgCertificateStatusesQueryParamsDto } from './dto/org-certificate-statuses-query-params.dto';
import { OrgCertificateStatusesExportQueryParamsDto } from './dto/org-certificate-statuses-export-query-params.dto';
import { PaginatedOrgCertificateStatusesResponseDto } from './dto/org-certificate-status-response.dto';

@ApiTags('Academy Access')
@Controller('academy-access')
export class AcademyAccessController {
  private readonly logger = new Logger(AcademyAccessController.name);

  constructor(
    private readonly evaluateAcademyAccessUseCase: EvaluateAcademyAccessUseCase,
    private readonly getOrgSettingsUseCase: GetOrgAcademyAccessSettingsUseCase,
    private readonly upsertOrgSettingsUseCase: UpsertOrgAcademyAccessSettingsUseCase,
    private readonly listOrgCertificateStatusesUseCase: ListOrgCertificateStatusesUseCase,
    private readonly exportOrgCertificateStatusesUseCase: ExportOrgCertificateStatusesUseCase,
    private readonly getOrgMemberCertificateUseCase: GetOrgMemberCertificateUseCase,
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
    this.logger.log({ orgId, mode: dto.mode }, 'upsertOrgSettings');

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
    this.logger.log(
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

  @Get('org-certificates/export.csv')
  @Roles(UserRole.ADMIN)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    `attachment; filename="${CERTIFICATE_OVERVIEW_EXPORT_FILE_NAME}"`,
  )
  @ApiOperation({
    summary: 'Export the certificate overview as CSV',
    description:
      'Every member matching the search and status filter, across all pages, with name, e-mail, status, last-passed date and renewal date.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The CSV file',
    content: {
      'text/csv': { schema: { type: 'string', format: 'binary' } },
    },
  })
  async exportOrgCertificates(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Query() queryParams: OrgCertificateStatusesExportQueryParamsDto,
  ): Promise<string> {
    // Counted rather than logged for the same reason as in listOrgCertificates.
    this.logger.log(
      {
        orgId,
        status: queryParams.status,
        hasSearch: queryParams.search !== undefined,
      },
      'exportOrgCertificates',
    );

    return this.exportOrgCertificateStatusesUseCase.execute(
      new ExportOrgCertificateStatusesQuery({
        orgId,
        search: queryParams.search,
        status: queryParams.status,
      }),
    );
  }

  @Get('org-certificates/:userId/certificate')
  @Roles(UserRole.ADMIN)
  @RateLimit({ limit: 60, windowMs: 15 * 60 * 1000, keyBy: 'user' })
  @ApiOperation({
    summary: "Download a member's participation confirmation",
    description:
      "The same Teilnahmebestätigung PDF the member can download themselves, for a member of the admin's own organization.",
  })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The certificate PDF',
    content: {
      'application/pdf': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiTooManyRequestsResponse({
    description: 'The administrator has exceeded the download quota',
  })
  @ApiNotFoundResponse({
    description:
      'The user is not a member of the organization or has not completed the academy',
  })
  async getOrgMemberCertificate(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Param('userId', ParseUUIDPipe) userId: UUID,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log({ orgId, userId }, 'getOrgMemberCertificate');

    const certificate = await this.getOrgMemberCertificateUseCase.execute(
      new GetOrgMemberCertificateQuery({ orgId, userId }),
    );

    res.set({
      'Content-Type': certificate.mimeType,
      'Content-Disposition': `attachment; filename="${certificate.fileName}"`,
    });

    return new StreamableFile(certificate.buffer);
  }
}
