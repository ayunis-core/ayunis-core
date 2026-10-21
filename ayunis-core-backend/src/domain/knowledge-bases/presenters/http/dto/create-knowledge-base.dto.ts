import { ApiProperty } from '@nestjs/swagger';
import { CreateKnowledgeBaseOwnerDto } from 'src/domain/knowledge-bases/presenters/http/dto/create-knowledge-base-owner.dto';
import {
  IsString,
  IsNotEmpty,
  Length,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateKnowledgeBaseDto extends CreateKnowledgeBaseOwnerDto {
  @ApiProperty({
    description: 'The name of the knowledge base',
    example: 'Stadtratsprotokolle 2025',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;

  @ApiProperty({
    description: 'An optional description of the knowledge base',
    example: 'Sammlung aller Stadtratsprotokolle aus dem Jahr 2025',
    required: false,
    maxLength: 2000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;
}
