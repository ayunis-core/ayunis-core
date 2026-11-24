import { Injectable } from '@nestjs/common';
import type { OparlSystem } from 'src/domain/oparl/domain/oparl-system.entity';
import { emptyOparlDocumentStats } from 'src/domain/oparl/application/models/oparl-document';
import type { OparlSystemOverview } from 'src/domain/oparl/application/models/oparl-system-overview';
import { OparlDocumentsRepository } from 'src/domain/oparl/application/ports/oparl-documents.repository';
import { OparlMirrorRepository } from 'src/domain/oparl/application/ports/oparl-mirror.repository';
import { OparlSyncRunsRepository } from 'src/domain/oparl/application/ports/oparl-sync-runs.repository';
import { OparlChunkEmbedder } from './oparl-chunk-embedder.service';

/** Systems with their bodies, counts, running sync and document stats, in a fixed number of queries however many systems. */
@Injectable()
export class OparlSystemOverviews {
  constructor(
    private readonly mirror: OparlMirrorRepository,
    private readonly runs: OparlSyncRunsRepository,
    private readonly documents: OparlDocumentsRepository,
    private readonly embedder: OparlChunkEmbedder,
  ) {}

  async load(systems: OparlSystem[]): Promise<OparlSystemOverview[]> {
    const ids = systems.map((system) => system.id);
    // Vectors of a model no longer in use (archived, deleted) do not count.
    const model = await this.embedder.currentModel();
    const [bodies, counts, running, documents] = await Promise.all([
      this.mirror.findBodies(ids),
      this.mirror.countByType(ids),
      this.runs.findRunning(ids),
      this.documents.stats(ids, model?.id ?? null),
    ]);
    return systems.map((system) => ({
      system,
      bodies: bodies.filter((body) => body.systemId === system.id),
      counts: counts.get(system.id) ?? {},
      running: running.find((run) => run.systemId === system.id) ?? null,
      documents: documents.get(system.id) ?? emptyOparlDocumentStats(),
    }));
  }
}
