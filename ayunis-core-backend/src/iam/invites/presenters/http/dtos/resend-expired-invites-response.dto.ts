import { ApiProperty } from '@nestjs/swagger';
import { BulkInviteResultDto } from './create-bulk-invites-response.dto';

export class ResendExpiredInvitesResponseDto {
  @ApiProperty({
    description: 'Number of expired invites that were renewed',
    example: 10,
  })
  totalCount: number;

  @ApiProperty({
    description: 'Number of renewed invites that were delivered',
    example: 9,
  })
  successCount: number;

  @ApiProperty({
    description:
      'Number of renewed invites whose email could not be sent; they stay pending',
    example: 1,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Individual delivery result for each renewed invite',
    type: [BulkInviteResultDto],
  })
  results: BulkInviteResultDto[];
}
