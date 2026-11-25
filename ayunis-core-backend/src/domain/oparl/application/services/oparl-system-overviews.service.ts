import { Injectable } from '@nestjs/common';
import type { OparlSystem } from 'src/domain/oparl/domain/oparl-system.entity';
import type { OparlSystemOverview } from 'src/domain/oparl/application/models/oparl-system-overview';
import { OparlMirrorRepository } from 'src/domain/oparl/application/ports/oparl-mirror.repository';
import { OparlSyncRunsRepository } from 'src/domain/oparl/application/ports/oparl-sync-runs.repository';

/** Systems with their bodies, counts and running sync, in four queries however many systems. */
@Injectable()
export class OparlSystemOverviews {
  constructor(
    private readonly mirror: OparlMirrorRepository,
    private readonly runs: OparlSyncRunsRepository,
  ) {}

  async load(systems: OparlSystem[]): Promise<OparlSystemOverview[]> {
    const ids = systems.map((system) => system.id);
    const [bodies, counts, running] = await Promise.all([
      this.mirror.findBodies(ids),
      this.mirror.countByType(ids),
      this.runs.findRunning(ids),
    ]);
    return systems.map((system) => ({
      system,
      bodies: bodies.filter((body) => body.systemId === system.id),
      counts: counts.get(system.id) ?? {},
      running: running.find((run) => run.systemId === system.id) ?? null,
    }));
  }
}
