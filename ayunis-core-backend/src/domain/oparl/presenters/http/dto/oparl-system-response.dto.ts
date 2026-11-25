import { ApiProperty } from '@nestjs/swagger';
import { OparlSystemHealth } from 'src/domain/oparl/domain/oparl-system-health.enum';
import {
  OparlSyncKind,
  OparlSyncRunStatus,
} from 'src/domain/oparl/domain/oparl-sync-run.entity';

export class OparlBodyResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'The OParl ID (URL) of the body' })
  oparlId: string;

  @ApiProperty({ type: String, nullable: true })
  name: string | null;

  @ApiProperty({ type: String, nullable: true })
  shortName: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Web page in the RIS',
  })
  web: string | null;
}

export class OparlObjectCountsDto {
  @ApiProperty() body: number;
  @ApiProperty() legislativeTerm: number;
  @ApiProperty() organization: number;
  @ApiProperty() person: number;
  @ApiProperty() membership: number;
  @ApiProperty() meeting: number;
  @ApiProperty() agendaItem: number;
  @ApiProperty() paper: number;
  @ApiProperty() consultation: number;
  @ApiProperty() file: number;
  @ApiProperty() location: number;
}

export class OparlRunningSyncDto {
  @ApiProperty({ enum: OparlSyncKind, enumName: 'OparlSyncKind' })
  kind: OparlSyncKind;

  @ApiProperty()
  startedAt: Date;
}

export class OparlSkippedFilesDto {
  @ApiProperty({ description: 'Beyond the upload size limit' })
  tooLarge: number;

  @ApiProperty({ description: 'Beyond the page limit' })
  tooManyPages: number;

  @ApiProperty({ description: 'Of a type whose text is not read' })
  unsupportedType: number;

  @ApiProperty({ description: 'Damaged, protected or without text' })
  unreadable: number;
}

export class OparlFileTextCountsDto {
  @ApiProperty() total: number;

  @ApiProperty({ description: 'Not read yet, or changed since' })
  pending: number;

  @ApiProperty() extracted: number;

  @ApiProperty({ description: 'Could not be read for now; tried again later' })
  failed: number;

  @ApiProperty({
    type: OparlSkippedFilesDto,
    description: 'Kept as metadata only, by reason',
  })
  skipped: OparlSkippedFilesDto;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Error of the file that failed last',
  })
  lastError: string | null;
}

export class OparlIndexCountsDto {
  @ApiProperty({ description: 'Searchable chunks' })
  chunks: number;

  @ApiProperty({
    description: 'Chunks with a vector of the current OParl embedding model',
  })
  embeddedChunks: number;
}

export class OparlDocumentStatsDto {
  @ApiProperty({ type: OparlFileTextCountsDto })
  files: OparlFileTextCountsDto;

  @ApiProperty({ type: OparlIndexCountsDto })
  index: OparlIndexCountsDto;
}

export class OparlSystemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'The URL the system was added under' })
  url: string;

  @ApiProperty({ type: String, nullable: true })
  name: string | null;

  @ApiProperty({ type: String, nullable: true })
  vendor: string | null;

  @ApiProperty({ type: String, nullable: true })
  product: string | null;

  @ApiProperty({ type: String, nullable: true })
  oparlVersion: string | null;

  @ApiProperty({ type: [OparlBodyResponseDto] })
  bodies: OparlBodyResponseDto[];

  @ApiProperty({ type: OparlObjectCountsDto })
  counts: OparlObjectCountsDto;

  @ApiProperty({ enum: OparlSystemHealth, enumName: 'OparlSystemHealth' })
  health: OparlSystemHealth;

  @ApiProperty({ type: OparlRunningSyncDto, nullable: true })
  running: OparlRunningSyncDto | null;

  @ApiProperty({ type: OparlDocumentStatsDto })
  documents: OparlDocumentStatsDto;

  @ApiProperty({ type: Date, nullable: true })
  lastDeltaSyncAt: Date | null;

  @ApiProperty({ type: Date, nullable: true })
  lastFullSyncAt: Date | null;

  @ApiProperty({
    enum: OparlSyncRunStatus,
    enumName: 'OparlSyncRunStatus',
    nullable: true,
  })
  lastRunStatus: OparlSyncRunStatus | null;

  @ApiProperty({ type: Date, nullable: true })
  lastRunFinishedAt: Date | null;

  @ApiProperty({ type: String, nullable: true })
  lastError: string | null;

  @ApiProperty()
  nextSyncAt: Date;

  @ApiProperty()
  createdAt: Date;
}
