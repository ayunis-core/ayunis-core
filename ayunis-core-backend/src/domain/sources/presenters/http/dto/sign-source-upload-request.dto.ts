import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** S3 allows part numbers 1 through 10,000. */
const MAX_PART_NUMBER = 10_000;
const METHODS = ['PUT', 'POST', 'GET', 'DELETE'] as const;

export class SignSourceUploadRequestDto {
  @ApiProperty({
    description:
      'S3 request to sign: PUT (whole object, or a part with uploadId and partNumber), POST (initiate without uploadId, complete with uploadId), GET (list parts), DELETE (abort).',
    enum: METHODS,
  })
  @IsIn(METHODS)
  method: (typeof METHODS)[number];

  @ApiPropertyOptional({
    description:
      'S3 multipart upload id, for every multipart step after initiation',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  uploadId?: string;

  @ApiPropertyOptional({ description: '1-based part number', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PART_NUMBER)
  partNumber?: number;
}
