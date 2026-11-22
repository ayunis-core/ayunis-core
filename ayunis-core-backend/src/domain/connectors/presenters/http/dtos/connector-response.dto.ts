import { ApiProperty } from '@nestjs/swagger';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import { ConnectorStatus } from 'src/domain/connectors/domain/connector-status.enum';

export class ConnectorResponseDto {
  @ApiProperty({
    description: 'The product this connector connects to',
    enum: ConnectorProduct,
    enumName: 'ConnectorProduct',
  })
  product: ConnectorProduct;

  @ApiProperty({
    description: 'Whether the organization has set up this connector',
    enum: ConnectorStatus,
    enumName: 'ConnectorStatus',
  })
  status: ConnectorStatus;
}
