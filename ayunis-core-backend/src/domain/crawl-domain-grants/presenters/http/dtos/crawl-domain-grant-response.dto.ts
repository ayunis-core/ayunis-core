import { ApiProperty } from '@nestjs/swagger';

export class CrawlDomainGrantResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  orgId: string;

  @ApiProperty({ example: 'intranet.customer.de' })
  domain: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}
