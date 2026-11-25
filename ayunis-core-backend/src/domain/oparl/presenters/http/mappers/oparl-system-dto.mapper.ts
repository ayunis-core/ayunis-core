import { OparlEntityType } from 'src/domain/oparl/domain/oparl-entity-type.enum';
import type { OparlTypeCounts } from 'src/domain/oparl/domain/oparl-sync-run.entity';
import type { OparlSystemOverview } from 'src/domain/oparl/application/models/oparl-system-overview';
import type {
  OparlObjectCountsDto,
  OparlSystemResponseDto,
} from 'src/domain/oparl/presenters/http/dto/oparl-system-response.dto';

function toCountsDto(counts: OparlTypeCounts): OparlObjectCountsDto {
  const count = (type: OparlEntityType) => counts[type] ?? 0;
  return {
    body: count(OparlEntityType.BODY),
    legislativeTerm: count(OparlEntityType.LEGISLATIVE_TERM),
    organization: count(OparlEntityType.ORGANIZATION),
    person: count(OparlEntityType.PERSON),
    membership: count(OparlEntityType.MEMBERSHIP),
    meeting: count(OparlEntityType.MEETING),
    agendaItem: count(OparlEntityType.AGENDA_ITEM),
    paper: count(OparlEntityType.PAPER),
    consultation: count(OparlEntityType.CONSULTATION),
    file: count(OparlEntityType.FILE),
    location: count(OparlEntityType.LOCATION),
  };
}

export function toOparlSystemResponseDto({
  system,
  bodies,
  counts,
  running,
}: OparlSystemOverview): OparlSystemResponseDto {
  return {
    id: system.id,
    url: system.url,
    name: system.name,
    vendor: system.vendor,
    product: system.product,
    oparlVersion: system.oparlVersion,
    bodies: bodies.map(({ id, oparlId, name, shortName, web }) => ({
      id,
      oparlId,
      name,
      shortName,
      web,
    })),
    counts: toCountsDto(counts),
    health: system.health,
    running: running
      ? { kind: running.kind, startedAt: running.startedAt }
      : null,
    lastDeltaSyncAt: system.lastDeltaSyncAt,
    lastFullSyncAt: system.lastFullSyncAt,
    lastRunStatus: system.lastRunStatus,
    lastRunFinishedAt: system.lastRunFinishedAt,
    lastError: system.lastError,
    nextSyncAt: system.nextSyncAt,
    createdAt: system.createdAt,
  };
}
