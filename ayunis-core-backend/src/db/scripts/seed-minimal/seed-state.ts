import type { SeedRunner } from 'src/db/scripts/utils/seed-runner';
import type { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import type { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import type { SeededModels } from './seed-types';
import { minimalFixture } from 'src/db/fixtures/minimal.fixture';

function required<T>(value: T | undefined, step: string): T {
  if (value === undefined) {
    throw new Error(`Seed step accessed "${step}" before it was produced`);
  }

  return value;
}

export class SeedState {
  readonly fixture = minimalFixture;

  private modelsValue?: SeededModels;
  private readonly orgRecords = new Map<string, OrgRecord>();
  private readonly adminRecords = new Map<string, UserRecord>();

  constructor(readonly runner: SeedRunner) {}

  setModels(value: SeededModels): void {
    this.modelsValue = value;
  }
  getModels(): SeededModels {
    return required(this.modelsValue, 'models');
  }

  setOrg(key: string, record: OrgRecord): void {
    this.orgRecords.set(key, record);
  }
  getOrg(key: string): OrgRecord {
    return required(this.orgRecords.get(key), `org "${key}"`);
  }

  setAdmin(key: string, record: UserRecord): void {
    this.adminRecords.set(key, record);
  }
  getAdmin(key: string): UserRecord {
    return required(this.adminRecords.get(key), `admin "${key}"`);
  }
}
