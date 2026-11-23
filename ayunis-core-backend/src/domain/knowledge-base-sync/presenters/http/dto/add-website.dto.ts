import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { WEB_SYNC_MAX_DEPTH } from 'src/domain/knowledge-base-sync/domain/web-synced-location.entity';

export class AddWebsiteDto {
  @ApiProperty({
    description: 'The URL of the website, where the crawl starts',
    example: 'https://www.musterstadt.de/rathaus',
    maxLength: 2048,
  })
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @IsNotEmpty()
  @MaxLength(2048)
  url: string;

  @ApiPropertyOptional({
    description:
      'How many links deep to follow from the URL on every sync ' +
      '(0 = just this page, 1 = + linked pages, 2 = + their links). ' +
      'Only same-site links are followed. Defaults to 0.',
    minimum: 0,
    maximum: WEB_SYNC_MAX_DEPTH,
    default: 0,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(WEB_SYNC_MAX_DEPTH)
  maxDepth?: number;
}
