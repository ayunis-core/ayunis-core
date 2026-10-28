import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  WORKSPACE_COLOR_PATTERN,
  WORKSPACE_DESCRIPTION_MAX_LENGTH,
  WORKSPACE_ICON_PATTERN,
  WORKSPACE_NAME_MAX_LENGTH,
} from 'src/domain/workspaces/domain/workspaces.constants';

export class CreateWorkspaceDto {
  @ApiProperty({
    description: 'Name of the workspace',
    example: 'Bürgeranfragen',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(WORKSPACE_NAME_MAX_LENGTH)
  name: string;

  @ApiPropertyOptional({
    description: 'What the workspace is for',
    example: 'Anfragen von Bürgerinnen und Bürgern bündeln',
  })
  @IsOptional()
  @IsString()
  @MaxLength(WORKSPACE_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiPropertyOptional({
    description: 'Key of the workspace icon from the client icon catalogue',
    example: 'landmark',
  })
  @IsOptional()
  @IsString()
  @Matches(WORKSPACE_ICON_PATTERN)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Palette key or #rrggbb literal for the workspace colour',
    example: '#6b5bd6',
  })
  @IsOptional()
  @IsString()
  @Matches(WORKSPACE_COLOR_PATTERN)
  color?: string;
}
