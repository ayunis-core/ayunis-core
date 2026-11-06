import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateSourceUploadDto {
  @ApiProperty({
    description: 'Original file name, including its extension',
    example: 'Protokoll_Stadtrat_2025-03.pdf',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({
    description:
      'MIME type reported by the browser; may be empty when unknown. The server derives the canonical type from it and the file name.',
    example: 'application/pdf',
  })
  @IsString()
  @MaxLength(255)
  mimeType: string;

  @ApiProperty({
    description: 'Exact size of the file in bytes',
    example: 1048576,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  fileSize: number;
}
