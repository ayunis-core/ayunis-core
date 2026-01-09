import { ApiProperty } from '@nestjs/swagger';

export class DeleteAllPendingInvitesResponseDto {
  @ApiProperty({ description: 'Number of invites deleted' })
  deletedCount: number;
}
