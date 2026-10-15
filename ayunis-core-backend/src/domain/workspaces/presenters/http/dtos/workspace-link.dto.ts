import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';

export class LinkPersonDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  id: UUID;

  @ApiProperty()
  name: string;
}

export class LinkOwnerDto {
  @ApiProperty({ enum: ['personal', 'team', 'org'] })
  type: 'personal' | 'team' | 'org';

  @ApiProperty({ type: 'string', format: 'uuid' })
  id: UUID;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Person or team name; null for the organisation',
  })
  name: string | null;
}

export class LinkedWorkspaceDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  id: UUID;

  @ApiProperty()
  name: string;

  @ApiProperty()
  icon: string;

  @ApiProperty()
  color: string;

  @ApiProperty({
    type: LinkPersonDto,
    nullable: true,
    description: 'Null when the person who linked it no longer exists',
  })
  linkedBy: LinkPersonDto | null;
}

export class LinkedWorkspacesResponseDto {
  @ApiProperty({
    description:
      'All workspaces the item is linked into, including ones the caller cannot open',
  })
  total: number;

  @ApiProperty({
    type: [LinkedWorkspaceDto],
    description: 'Only the workspaces the caller can open',
  })
  workspaces: LinkedWorkspaceDto[];
}
