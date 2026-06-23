import dataSource from 'src/db/datasource';
import type {
  DeepPartial,
  EntityTarget,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { log } from 'src/db/scripts/utils/seed-log';
import type { SeedState } from '../seed-state';
import type { OrgFixture } from '../seed-types';

export abstract class BaseSeeder {
  protected repo<T extends ObjectLiteral>(
    target: EntityTarget<T>,
  ): Repository<T> {
    return dataSource.getRepository(target);
  }

  protected async findOrCreate<T extends ObjectLiteral>(
    repo: Repository<T>,
    where: FindOptionsWhere<T>,
    build: () => Partial<T>,
    label: { entity: string; name: string },
  ): Promise<T> {
    const existing = await repo.findOne({ where });
    if (existing) {
      log(label.entity, label.name, false);
      return existing;
    }

    const record = await repo.save(repo.create(build() as DeepPartial<T>));
    log(label.entity, label.name, true);
    return record;
  }
}

// Runs once per seed run (e.g. the shared model catalog, platform config).
export abstract class GlobalSeeder extends BaseSeeder {
  abstract seed(ctx: SeedState): Promise<void>;
}

// Runs once per org; SeedManager owns the loop over fixture.orgs.
export abstract class OrgSeeder extends BaseSeeder {
  abstract seedForOrg(ctx: SeedState, org: OrgFixture): Promise<void>;
}
