import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import { SyncedFileSkipReason } from 'src/domain/knowledge-base-sync/domain/synced-file-skip-reason.enum';
import { SyncedLocationState } from 'src/domain/knowledge-base-sync/domain/synced-location-state.enum';

export class SkippedSyncedFileResponseDto {
  @ApiProperty({ example: 'Ortsplan.jpg' })
  name: string;

  @ApiProperty({
    description: 'Below the location, including the name',
    example: 'Bilder/Ortsplan.jpg',
  })
  path: string;

  @ApiProperty({
    description: 'Why the file is set aside',
    enum: SyncedFileSkipReason,
    enumName: 'SyncedFileSkipReason',
  })
  reason: SyncedFileSkipReason;
}

export class SyncedLocationResponseDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  id: UUID;

  @ApiProperty({ enum: ConnectorProduct, enumName: 'ConnectorProduct' })
  product: ConnectorProduct;

  @ApiProperty({
    description: 'The URL that is synced',
    example: 'https://contoso.sharepoint.com/sites/bauamt',
  })
  location: string;

  @ApiProperty({
    description:
      'Whether the connector still reaches the location; its documents stay when it does not',
    enum: SyncedLocationState,
    enumName: 'SyncedLocationState',
  })
  state: SyncedLocationState;

  @ApiProperty({
    description:
      'When the location was last synced; null before its first sync',
    type: 'string',
    format: 'date-time',
    nullable: true,
  })
  lastSyncedAt: Date | null;

  @ApiProperty({
    description:
      'Since when a sync runs, until its files are processed; null between syncs',
    type: 'string',
    format: 'date-time',
    nullable: true,
  })
  syncingSince: Date | null;

  @ApiProperty({
    description:
      'While syncing is paused after the provider was unavailable: the next attempt',
    type: 'string',
    format: 'date-time',
    nullable: true,
  })
  pausedUntil: Date | null;

  @ApiProperty({
    description: 'When the next scheduled sync is due',
    type: 'string',
    format: 'date-time',
  })
  nextSyncAt: Date;

  @ApiProperty({ description: 'Files synced as documents' })
  documentCount: number;

  @ApiProperty({
    description: 'Synced files whose latest version failed to process',
  })
  failedCount: number;

  @ApiProperty({
    description:
      "Files not synced because the knowledge base's document limit is reached",
  })
  notSyncedLimitReachedCount: number;

  @ApiProperty({
    description: 'Files set aside, e.g. unsupported or encrypted',
  })
  skippedCount: number;

  @ApiProperty({
    description: 'The first files set aside, by path',
    type: [SkippedSyncedFileResponseDto],
  })
  skippedFiles: SkippedSyncedFileResponseDto[];
}

export class SyncedLocationListResponseDto {
  @ApiProperty({ type: [SyncedLocationResponseDto] })
  data: SyncedLocationResponseDto[];

  @ApiProperty({
    description:
      'The products whose locations can be added: those the organization has set up',
    enum: ConnectorProduct,
    enumName: 'ConnectorProduct',
    isArray: true,
  })
  availableProducts: ConnectorProduct[];
}
