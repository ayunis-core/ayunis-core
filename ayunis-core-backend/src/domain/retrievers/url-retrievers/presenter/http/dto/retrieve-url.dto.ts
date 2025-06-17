import { IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RetrieveUrlDto {
  @ApiProperty({
    description: 'URL to retrieve content from',
    example: 'https://example.com/article',
  })
  @IsNotEmpty()
  @IsUrl()
  url: string;
}
