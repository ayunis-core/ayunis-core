import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { PermittedModelRecord } from 'src/domain/models/infrastructure/persistence/local-permitted-models/schema/permitted-model.record';
import { RolePermissionRecord } from 'src/iam/permissions/infrastructure/persistence/local/schema/role-permission.record';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import {
  CONFIGURABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
} from 'src/iam/permissions/domain/default-role-permissions.constants';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { OrgSeeder } from './base-seeder';
import { log } from 'src/db/scripts/utils/seed-log';
import type { SeedState } from '../seed-state';
import type { SeededModels, MemberFixture, OrgFixture } from '../seed-types';

interface UserSpec {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  systemRole: SystemRole;
  emailVerified: boolean;
  hasAcceptedMarketing: boolean;
}

const MEMBER_PASSWORD = 'admin';

export class OrgUserSeeder extends OrgSeeder {
  async seedForOrg(ctx: SeedState, org: OrgFixture): Promise<void> {
    const orgRecord = await this.seedOrg(org.name);
    ctx.setOrg(org.key, orgRecord);

    const admin = await this.seedUser(ctx, orgRecord.id, org.admin);
    ctx.setAdmin(org.key, admin);

    await this.seedPermittedModels(ctx, orgRecord.id, ctx.getModels());
    await this.seedMembers(ctx, orgRecord.id, org.members);
    await this.seedRolePermissions(orgRecord.id);
  }

  // The seed writes orgs straight to the repo, bypassing the org.created
  // listener that normally plants an org's default grants — so mirror
  // DEFAULT_ROLE_PERMISSIONS here, else seeded MANAGER/USER accounts start with
  // no permissions.
  private async seedRolePermissions(orgId: UUID): Promise<void> {
    const repo = this.repo(RolePermissionRecord);
    for (const role of CONFIGURABLE_ROLES) {
      for (const permission of DEFAULT_ROLE_PERMISSIONS[role]) {
        await this.findOrCreate(
          repo,
          { orgId, role, permission },
          () => ({ id: randomUUID(), orgId, role, permission }),
          { entity: 'Role permission', name: `${role}:${permission}` },
        );
      }
    }
  }

  private async seedOrg(name: string): Promise<OrgRecord> {
    return this.findOrCreate(
      this.repo(OrgRecord),
      { name },
      () => ({ id: randomUUID(), name }),
      { entity: 'Org', name },
    );
  }

  private async seedMembers(
    ctx: SeedState,
    orgId: UUID,
    members: readonly MemberFixture[],
  ): Promise<void> {
    for (const member of members) {
      await this.seedUser(ctx, orgId, {
        email: member.email,
        password: MEMBER_PASSWORD,
        name: member.name,
        role: UserRole.USER,
        systemRole: SystemRole.CUSTOMER,
        emailVerified: true,
        hasAcceptedMarketing: false,
      });
    }
  }

  private async seedUser(
    ctx: SeedState,
    orgId: UUID,
    spec: UserSpec,
  ): Promise<UserRecord> {
    const users = this.repo(UserRecord);
    const existing = await users.findOne({ where: { email: spec.email } });
    if (existing) {
      log('User', existing.email, false);
      return existing;
    }

    const passwordHash = await ctx.runner.hashPassword(spec.password);
    const created = await users.save(
      users.create({
        id: randomUUID(),
        email: spec.email,
        passwordHash,
        orgId,
        name: spec.name,
        role: spec.role,
        systemRole: spec.systemRole,
        emailVerified: spec.emailVerified,
        hasAcceptedMarketing: spec.hasAcceptedMarketing,
      }),
    );
    log('User', created.email, true);
    return created;
  }

  private async seedPermittedModels(
    ctx: SeedState,
    orgId: UUID,
    models: SeededModels,
  ): Promise<void> {
    const repo = this.repo(PermittedModelRecord);
    for (const { modelKey, isDefault, anonymousOnly } of ctx.fixture
      .permittedModels) {
      const model = models[modelKey];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard against fixture/seed drift
      if (!model) {
        throw new Error(`Model key "${modelKey}" not found in seeded models`);
      }
      const modelId = model.id;

      await this.findOrCreate(
        repo,
        { modelId, orgId },
        () => ({ id: randomUUID(), modelId, orgId, isDefault, anonymousOnly }),
        {
          entity: 'Permitted model',
          name: `${modelKey} (default=${String(isDefault)})`,
        },
      );
    }
  }
}
