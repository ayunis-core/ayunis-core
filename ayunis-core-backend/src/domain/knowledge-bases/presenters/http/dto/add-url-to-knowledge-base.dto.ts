import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUrl } from 'class-validator';

export class AddUrlToKnowledgeBaseDto {
  @ApiProperty({
    description: 'The URL to crawl and add to the knowledge base',
    example: 'https://example.com/page',
  })
  @IsUrl({ require_protocol: true })
  @IsNotEmpty()
  url: string;
}
