import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  MinLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class UpdateTeamDto {
  @ApiProperty({
    description: 'The new name of the team',
    example: 'Engineering',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Whether model access override is enabled for this team',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  modelOverrideEnabled?: boolean;
}
