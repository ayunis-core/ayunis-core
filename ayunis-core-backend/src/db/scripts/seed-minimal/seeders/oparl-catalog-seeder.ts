import { randomUUID } from 'crypto';
import { OparlBodyRecord } from 'src/domain/oparl/infrastructure/persistence/postgres/schema/oparl-body.record';
import { OparlSystemRecord } from 'src/domain/oparl/infrastructure/persistence/postgres/schema/oparl-system.record';
import type { OparlSystemFixture } from 'src/db/fixtures/minimal-fixture.types';
import type { SeedState } from 'src/db/scripts/seed-minimal/seed-state';
import { GlobalSeeder } from './base-seeder';

const OPARL_SYSTEM_TYPE = 'https://schema.oparl.org/1.1/System';
const OPARL_BODY_TYPE = 'https://schema.oparl.org/1.1/Body';
// The sweep only picks up systems that are due.
const NEVER = new Date('9999-12-31T00:00:00Z');

export class OparlCatalogSeeder extends GlobalSeeder {
  async seed(ctx: SeedState): Promise<void> {
    for (const fixture of ctx.fixture.oparlSystems) {
      await this.seedSystem(fixture);
    }
  }

  private async seedSystem(fixture: OparlSystemFixture): Promise<void> {
    const system = await this.findOrCreate(
      this.repo(OparlSystemRecord),
      { url: fixture.url },
      () => ({
        id: randomUUID(),
        url: fixture.url,
        oparlId: fixture.url,
        name: fixture.name,
        vendor: fixture.vendor,
        raw: { id: fixture.url, type: OPARL_SYSTEM_TYPE, name: fixture.name },
        nextSyncAt: NEVER,
      }),
      { entity: 'OParl system', name: fixture.name },
    );
    for (const body of fixture.bodies) {
      await this.findOrCreate(
        this.repo(OparlBodyRecord),
        { systemId: system.id, oparlId: body.oparlId },
        () => ({
          id: randomUUID(),
          systemId: system.id,
          oparlId: body.oparlId,
          name: body.name,
          shortName: body.shortName,
          raw: {
            id: body.oparlId,
            type: OPARL_BODY_TYPE,
            system: fixture.url,
            name: body.name,
            shortName: body.shortName,
          },
          fromListing: true,
        }),
        { entity: 'OParl body', name: body.name },
      );
    }
  }
}
