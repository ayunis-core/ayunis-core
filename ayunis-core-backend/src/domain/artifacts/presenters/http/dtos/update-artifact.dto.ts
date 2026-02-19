import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { ARTIFACT_MAX_CONTENT_LENGTH } from '../../../application/artifacts.errors';

export class UpdateArtifactDto {
  @ApiProperty({
    description: 'Updated HTML content of the document',
    example: '<p>Updated meeting notes...</p>',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(ARTIFACT_MAX_CONTENT_LENGTH)
  content: string;

  @ApiProperty({
    description: 'Who authored this version',
    enum: AuthorType,
    example: AuthorType.USER,
  })
  @IsEnum(AuthorType)
  authorType: AuthorType;
}
