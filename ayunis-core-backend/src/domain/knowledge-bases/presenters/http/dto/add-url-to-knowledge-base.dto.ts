import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class AddUrlToKnowledgeBaseDto {
  @ApiProperty({
    description: 'The URL to crawl and add to the knowledge base',
    example: 'https://example.com/page',
  })
  @IsUrl({ require_protocol: true })
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({
    description:
      'How many links deep to follow from the URL when crawling ' +
      '(0 = just this page, 1 = + linked pages, 2 = + their links). ' +
      'Only same-domain links are followed. Defaults to 0.',
    minimum: 0,
    maximum: 2,
    default: 0,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  maxDepth?: number;
}
