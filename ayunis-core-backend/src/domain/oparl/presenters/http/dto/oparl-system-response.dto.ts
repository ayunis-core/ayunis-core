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
