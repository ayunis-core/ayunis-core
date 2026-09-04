import { Injectable } from '@nestjs/common';
import type { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';
import {
  OrgSsoConnectionResourceDto,
  OrgSsoConnectionResponseDto,
} from 'src/iam/sso/presenters/http/dto/org-sso-connection.response-dto';

@Injectable()
export class OrgSsoConnectionResponseDtoMapper {
  toDto(connection: OrgSsoConnection): OrgSsoConnectionResponseDto {
    return {
      id: connection.id,
      orgId: connection.orgId,
      emailDomains: connection.emailDomains,
      zitadelOrgId: connection.zitadelOrgId,
      zitadelIdpId: connection.zitadelIdpId,
      enabled: connection.enabled,
      jitProvisioningEnabled: connection.jitProvisioningEnabled,
      localPasswordLoginEnabled: connection.localPasswordLoginEnabled,
    };
  }

  toResource(connection: OrgSsoConnection | null): OrgSsoConnectionResourceDto {
    return { connection: connection ? this.toDto(connection) : null };
  }
}
