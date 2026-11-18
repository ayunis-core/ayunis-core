import { ApiProperty } from '@nestjs/swagger';
import { ConnectorStatus } from 'src/domain/connectors/domain/connector-status.enum';

export class Microsoft365ConnectorResponseDto {
  @ApiProperty({
    description: 'Whether the organization has set up Microsoft 365',
    enum: ConnectorStatus,
    enumName: 'ConnectorStatus',
  })
  status: ConnectorStatus;

  @ApiProperty({
    description: 'Directory (tenant) ID; null while not set up',
    type: String,
    nullable: true,
  })
  tenantId: string | null;

  @ApiProperty({
    description: 'Application (client) ID; null while not set up',
    type: String,
    nullable: true,
  })
  clientId: string | null;
}
