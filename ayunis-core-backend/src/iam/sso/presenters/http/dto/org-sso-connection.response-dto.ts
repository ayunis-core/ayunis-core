import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';

export class OrgSsoConnectionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: UUID;

  @ApiProperty({ format: 'uuid' })
  orgId: UUID;

  @ApiProperty({ example: 'stadt.example' })
  emailDomain: string;

  @ApiProperty({ type: Date })
  domainVerifiedAt: Date;

  @ApiProperty({ type: String, example: '385820595704561666', nullable: true })
  zitadelOrgId: string | null;

  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  jitProvisioningEnabled: boolean;
}

export class OrgSsoConnectionResourceDto {
  @ApiProperty({ type: OrgSsoConnectionResponseDto, nullable: true })
  connection: OrgSsoConnectionResponseDto | null;
}
