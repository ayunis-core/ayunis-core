import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  Length,
  MaxLength,
} from 'class-validator';

export class UpdateKnowledgeBaseDto {
  @ApiProperty({
    description: 'The name of the knowledge base',
    example: 'Stadtratsprotokolle 2025',
    required: false,
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name?: string;

  @ApiProperty({
    description: 'The description of the knowledge base',
    example: 'Sammlung aller Stadtratsprotokolle aus dem Jahr 2025',
    required: false,
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
