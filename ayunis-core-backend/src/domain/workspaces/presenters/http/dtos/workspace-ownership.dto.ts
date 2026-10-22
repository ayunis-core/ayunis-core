import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { IsUUID } from 'class-validator';

export class TransferWorkspaceOwnershipDto {
  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'Someone who has access to the workspace today',
  })
  @IsUUID()
  userId: UUID;
}

export class OwnershipCandidateDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  id: UUID;

  @ApiProperty()
  name: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Primary team of the person; null without a team',
  })
  affiliation: string | null;
}

export class OwnershipCandidatesResponseDto {
  @ApiProperty({
    type: [OwnershipCandidateDto],
    description: 'Everyone with access except the owner, sorted by name',
  })
  people: OwnershipCandidateDto[];
}
