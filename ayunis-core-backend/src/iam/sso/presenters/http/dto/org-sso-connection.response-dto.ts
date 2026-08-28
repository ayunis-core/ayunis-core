import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';

export class SsoEmailDomainResponseDto {
  @ApiProperty({ example: 'stadt.example' })
  emailDomain: string;

  @ApiProperty({ type: Date })
  verifiedAt: Date;
}

export class OrgSsoConnectionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: UUID;

  @ApiProperty({ format: 'uuid' })
  orgId: UUID;

  @ApiProperty({ type: [SsoEmailDomainResponseDto] })
  emailDomains: SsoEmailDomainResponseDto[];

  @ApiProperty({ type: String, example: '385820595704561666', nullable: true })
  zitadelOrgId: string | null;

  @ApiProperty({
    type: String,
    example: '387952532174929922',
    nullable: true,
    description:
      'When set, login redirects straight to this broker identity provider',
  })
  zitadelIdpId: string | null;

  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  jitProvisioningEnabled: boolean;
}

export class OrgSsoConnectionResourceDto {
  @ApiProperty({ type: OrgSsoConnectionResponseDto, nullable: true })
  connection: OrgSsoConnectionResponseDto | null;
}
