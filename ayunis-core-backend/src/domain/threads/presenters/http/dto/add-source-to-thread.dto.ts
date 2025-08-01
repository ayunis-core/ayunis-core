import { IsNotEmpty, IsUUID, IsUrl } from 'class-validator';
import { UUID } from 'crypto';
import { ApiProperty } from '@nestjs/swagger';

export class AddFileSourceToThreadDto {}

export class AddUrlSourceToThreadDto {
  @ApiProperty({
    description: 'The ID of the user who owns this source',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: UUID;

  @ApiProperty({
    description: 'The URL to use as a source',
    example: 'https://example.com/article',
  })
  @IsUrl()
  @IsNotEmpty()
  url: string;
}
