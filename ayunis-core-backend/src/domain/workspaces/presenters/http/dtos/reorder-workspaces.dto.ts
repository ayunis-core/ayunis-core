import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

const MAX_REORDERABLE_WORKSPACES = 500;

export class ReorderWorkspacesDto {
  @ApiProperty({
    description:
      'Workspace ids in their new order. Ids the caller does not own are ignored.',
    type: [String],
    format: 'uuid',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
  })
  @IsArray()
  @ArrayMaxSize(MAX_REORDERABLE_WORKSPACES)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  workspaceIds: string[];
}
