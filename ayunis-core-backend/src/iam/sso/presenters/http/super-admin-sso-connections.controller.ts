import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  Logger,
} from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { ConfigureOrgSsoConnectionCommand } from 'src/iam/sso/application/use-cases/configure-org-sso-connection/configure-org-sso-connection.command';
import { ConfigureOrgSsoConnectionUseCase } from 'src/iam/sso/application/use-cases/configure-org-sso-connection/configure-org-sso-connection.use-case';
import { GetOrgSsoConnectionQuery } from 'src/iam/sso/application/use-cases/get-org-sso-connection/get-org-sso-connection.query';
import { GetOrgSsoConnectionUseCase } from 'src/iam/sso/application/use-cases/get-org-sso-connection/get-org-sso-connection.use-case';
import {
  type ReviewedSsoMapping,
  SetOrgSsoEnabledCommand,
} from 'src/iam/sso/application/use-cases/set-org-sso-enabled/set-org-sso-enabled.command';
import { SetOrgSsoEnabledUseCase } from 'src/iam/sso/application/use-cases/set-org-sso-enabled/set-org-sso-enabled.use-case';
import { SetOrgSsoJitProvisioningCommand } from 'src/iam/sso/application/use-cases/set-org-sso-jit-provisioning/set-org-sso-jit-provisioning.command';
import { SetOrgSsoJitProvisioningUseCase } from 'src/iam/sso/application/use-cases/set-org-sso-jit-provisioning/set-org-sso-jit-provisioning.use-case';
import { SetOrgSsoIdpCommand } from 'src/iam/sso/application/use-cases/set-org-sso-idp/set-org-sso-idp.command';
import { SetOrgSsoIdpUseCase } from 'src/iam/sso/application/use-cases/set-org-sso-idp/set-org-sso-idp.use-case';
import type { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';
import { ConfigureOrgSsoConnectionRequestDto } from 'src/iam/sso/presenters/http/dto/configure-org-sso-connection.request-dto';
import { OrgSsoConnectionResourceDto } from 'src/iam/sso/presenters/http/dto/org-sso-connection.response-dto';
import { SetOrgSsoEnabledRequestDto } from 'src/iam/sso/presenters/http/dto/set-org-sso-enabled.request-dto';
import { OrgSsoConnectionResponseDtoMapper } from 'src/iam/sso/presenters/http/mappers/org-sso-connection-response-dto.mapper';
import { SetOrgSsoIdpRequestDto } from 'src/iam/sso/presenters/http/dto/set-org-sso-idp.request-dto';
import { SetOrgSsoStateRequestDto } from 'src/iam/sso/presenters/http/dto/set-org-sso-state.request-dto';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

interface SsoAuditEvent {
  operation: string;
  actorId: UUID;
  orgId: UUID;
  connection: OrgSsoConnection;
  confirmation?: Record<string, boolean | string | string[]>;
}

@ApiTags('Super Admin SSO Connections')
@Controller('super-admin/orgs/:orgId/sso')
@SystemRoles(SystemRole.SUPER_ADMIN)
@ApiForbiddenResponse({ description: 'The requester is not a super admin' })
@ApiParam({ name: 'orgId', format: 'uuid' })
export class SuperAdminSsoConnectionsController {
  private readonly logger = new Logger(SuperAdminSsoConnectionsController.name);

  constructor(
    private readonly getConnectionUseCase: GetOrgSsoConnectionUseCase,
    private readonly configureConnectionUseCase: ConfigureOrgSsoConnectionUseCase,
    private readonly setEnabledUseCase: SetOrgSsoEnabledUseCase,
    private readonly setJitUseCase: SetOrgSsoJitProvisioningUseCase,
    private readonly setIdpUseCase: SetOrgSsoIdpUseCase,
    private readonly responseMapper: OrgSsoConnectionResponseDtoMapper,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get an organization SSO connection' })
  @ApiOkResponse({ type: OrgSsoConnectionResourceDto })
  async get(
    @Param('orgId', ParseUUIDPipe) orgId: UUID,
  ): Promise<OrgSsoConnectionResourceDto> {
    const connection = await this.find(orgId);
    return this.responseMapper.toResource(connection);
  }

  @Put()
  @ApiOperation({ summary: 'Configure an organization SSO connection' })
  @ApiOkResponse({ type: OrgSsoConnectionResourceDto })
  async configure(
    @Param('orgId', ParseUUIDPipe) orgId: UUID,
    @Body() dto: ConfigureOrgSsoConnectionRequestDto,
    @CurrentUser(UserProperty.ID) actorId: UUID,
  ): Promise<OrgSsoConnectionResourceDto> {
    const connection = await this.configureConnectionUseCase.execute(
      new ConfigureOrgSsoConnectionCommand(
        orgId,
        dto.emailDomains,
        dto.zitadelOrgId,
        dto.zitadelIdpId,
      ),
    );
    this.audit({
      operation: 'configure',
      actorId,
      orgId,
      connection,
      confirmation: { domainVerified: dto.domainVerified },
    });
    return this.responseMapper.toResource(connection);
  }

  @Patch('enabled')
  @ApiOperation({ summary: 'Enable or disable organization SSO' })
  @ApiOkResponse({ type: OrgSsoConnectionResourceDto })
  async setEnabled(
    @Param('orgId', ParseUUIDPipe) orgId: UUID,
    @Body() dto: SetOrgSsoEnabledRequestDto,
    @CurrentUser(UserProperty.ID) actorId: UUID,
  ): Promise<OrgSsoConnectionResourceDto> {
    const reviewedMapping = this.getReviewedMapping(dto);
    const connection = await this.setEnabledUseCase.execute(
      new SetOrgSsoEnabledCommand(orgId, dto.enabled, reviewedMapping),
    );
    this.audit({
      operation: 'set-enabled',
      actorId,
      orgId,
      connection,
      confirmation: reviewedMapping
        ? {
            confirmed: true,
            emailDomains: reviewedMapping.emailDomains,
            reviewedZitadelOrgId: reviewedMapping.zitadelOrgId,
          }
        : undefined,
    });
    return this.responseMapper.toResource(connection);
  }

  @Patch('jit-provisioning')
  @ApiOperation({ summary: 'Enable or disable JIT user provisioning' })
  @ApiOkResponse({ type: OrgSsoConnectionResourceDto })
  async setJitProvisioning(
    @Param('orgId', ParseUUIDPipe) orgId: UUID,
    @Body() dto: SetOrgSsoStateRequestDto,
    @CurrentUser(UserProperty.ID) actorId: UUID,
  ): Promise<OrgSsoConnectionResourceDto> {
    const connection = await this.setJitUseCase.execute(
      new SetOrgSsoJitProvisioningCommand(orgId, dto.enabled),
    );
    this.audit({
      operation: 'set-jit',
      actorId,
      orgId,
      connection,
    });
    return this.responseMapper.toResource(connection);
  }

  @Patch('idp')
  @ApiOperation({
    summary: 'Set or clear the identity provider users are sent straight to',
  })
  @ApiOkResponse({ type: OrgSsoConnectionResourceDto })
  async setIdp(
    @Param('orgId', ParseUUIDPipe) orgId: UUID,
    @Body() dto: SetOrgSsoIdpRequestDto,
    @CurrentUser(UserProperty.ID) actorId: UUID,
  ): Promise<OrgSsoConnectionResourceDto> {
    const connection = await this.setIdpUseCase.execute(
      new SetOrgSsoIdpCommand(orgId, dto.zitadelIdpId),
    );
    this.audit({
      operation: 'set-idp',
      actorId,
      orgId,
      connection,
    });
    return this.responseMapper.toResource(connection);
  }

  private find(orgId: UUID): Promise<OrgSsoConnection | null> {
    return this.getConnectionUseCase.execute(
      new GetOrgSsoConnectionQuery(orgId),
    );
  }

  private getReviewedMapping(
    dto: SetOrgSsoEnabledRequestDto,
  ): ReviewedSsoMapping | undefined {
    if (!dto.enabled) return undefined;
    if (
      dto.confirmed !== true ||
      !dto.reviewedEmailDomains ||
      !dto.reviewedZitadelOrgId
    ) {
      throw new BadRequestException(
        'Enabling SSO requires confirmation of the reviewed broker mapping',
      );
    }
    return {
      emailDomains: dto.reviewedEmailDomains,
      zitadelOrgId: dto.reviewedZitadelOrgId,
    };
  }

  private audit(event: SsoAuditEvent): void {
    const connection = this.responseMapper.toDto(event.connection);

    this.logger.log(
      {
        operation: event.operation,
        actorId: event.actorId,
        orgId: event.orgId,
        connection,
        confirmation: event.confirmation,
      },
      'Superadmin changed SSO connection',
    );
  }
}
