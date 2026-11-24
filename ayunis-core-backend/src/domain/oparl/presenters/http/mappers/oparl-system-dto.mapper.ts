import { OparlEntityType } from 'src/domain/oparl/domain/oparl-entity-type.enum';
import type { OparlTypeCounts } from 'src/domain/oparl/domain/oparl-sync-run.entity';
import type { OparlSystemOverview } from 'src/domain/oparl/application/models/oparl-system-overview';
import type { OparlDocumentStats } from 'src/domain/oparl/application/models/oparl-document';
import type {
  OparlDocumentStatsDto,
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

function toDocumentStatsDto({
  files,
  index,
}: OparlDocumentStats): OparlDocumentStatsDto {
  return {
    files: {
      total: files.total,
      pending: files.pending,
      extracted: files.extracted,
      failed: files.failed,
      skipped: {
        tooLarge: files.skipped.too_large,
        tooManyPages: files.skipped.too_many_pages,
        unsupportedType: files.skipped.unsupported_type,
        unreadable: files.skipped.unreadable,
      },
      lastError: files.lastError,
    },
    index: { chunks: index.chunks, embeddedChunks: index.embeddedChunks },
  };
}

export function toOparlSystemResponseDto({
  system,
  bodies,
  counts,
  running,
  documents,
}: OparlSystemOverview): OparlSystemResponseDto {
  return {
    id: system.id,
    url: system.url,
    name: system.name,
    vendor: system.vendor,
    product: system.product,
    oparlVersion: system.oparlVersion,
    bodies: bodies.map(({ id, oparlId, name, shortName, web, linkedOrgs }) => ({
      id,
      oparlId,
      name,
      shortName,
      web,
      linkedOrgs: linkedOrgs.map((org) => ({
        id: org.id,
        name: org.name,
        linkedAt: org.linkedAt,
      })),
    })),
    counts: toCountsDto(counts),
    health: system.health,
    running: running
      ? { kind: running.kind, startedAt: running.startedAt }
      : null,
    documents: toDocumentStatsDto(documents),
    lastDeltaSyncAt: system.lastDeltaSyncAt,
    lastFullSyncAt: system.lastFullSyncAt,
    lastRunStatus: system.lastRunStatus,
    lastRunFinishedAt: system.lastRunFinishedAt,
    lastError: system.lastError,
    nextSyncAt: system.nextSyncAt,
    createdAt: system.createdAt,
  };
}
