import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GrantCrawlDomainRequestDto {
  @ApiProperty({
    description:
      'The exact host to authorize for crawling by this organization. A full URL is accepted and reduced to its host.',
    example: 'intranet.customer.de',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  domain: string;
}
