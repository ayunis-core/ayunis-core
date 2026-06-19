import { ApiProperty } from '@nestjs/swagger';
import { BulkInviteResultDto } from './create-bulk-invites-response.dto';

export class SendPreparedInvitesResponseDto {
  @ApiProperty({
    description: 'Total number of prepared invites that were processed',
    example: 10,
  })
  totalCount: number;

  @ApiProperty({
    description: 'Number of prepared invites sent successfully',
    example: 9,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of prepared invites that failed to send',
    example: 1,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Individual results for each prepared invite',
    type: [BulkInviteResultDto],
  })
  results: BulkInviteResultDto[];
}
