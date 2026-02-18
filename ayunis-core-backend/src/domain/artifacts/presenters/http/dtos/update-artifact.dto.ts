import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';

const MAX_CONTENT_LENGTH = 512_000; // ~500KB

export class UpdateArtifactDto {
  @ApiProperty({
    description: 'Updated HTML content of the document',
    example: '<p>Updated meeting notes...</p>',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_CONTENT_LENGTH)
  content: string;

  @ApiProperty({
    description: 'Who authored this version',
    enum: AuthorType,
    example: AuthorType.USER,
  })
  @IsEnum(AuthorType)
  authorType: AuthorType;
}
