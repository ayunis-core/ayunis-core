import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class GeneratePersonalizedSystemPromptDto {
  @ApiProperty({
    description: 'The preferred name of the user',
    example: 'Maria',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  preferredName: string;

  @ApiProperty({
    description: 'The preferred communication style',
    example: 'Locker & kurz',
    maxLength: 500,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  communicationStyle?: string;

  @ApiProperty({
    description: 'The work context of the user',
    example: 'Bescheide im Sozialamt, Protokolle für den Gemeinderat',
    maxLength: 1000,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  workContext?: string;
}
