import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkspaceResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the workspace',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the workspace',
    example: 'Bürgeranfragen',
  })
  name: string;

  @ApiProperty({
    type: String,
    description: 'What the workspace is for',
    example: 'Anfragen von Bürgerinnen und Bürgern bündeln',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    type: String,
    description: 'Instructions that apply to every chat in the workspace',
    example: 'Answer with the tone and policies of the building department.',
    nullable: true,
  })
  instruction: string | null;

  @ApiProperty({
    description: 'Key of the workspace icon from the client icon catalogue',
    example: 'landmark',
  })
  icon: string;

  @ApiProperty({
    description: 'Palette key or #rrggbb literal for the workspace colour',
    example: '#6b5bd6',
  })
  color: string;

  @ApiProperty({
    description: 'When the workspace was created',
    example: '2026-08-11T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'When the workspace was last updated',
    example: '2026-08-11T10:30:00.000Z',
  })
  updatedAt: string;

  @ApiPropertyOptional({
    description:
      'Number of chats filed under the workspace (list responses only)',
    example: 3,
  })
  chatCount?: number;

  @ApiPropertyOptional({
    description:
      'Later of the last edit and the most recent chat activity (list responses only)',
    example: '2026-08-11T10:30:00.000Z',
  })
  lastActivityAt?: string;
}
