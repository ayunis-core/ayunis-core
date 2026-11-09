import { randomUUID, type UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { InviteMapper } from 'src/iam/invites/infrastructure/persistence/local/mappers/invite.mapper';
import { InviteTeamRecord } from 'src/iam/invites/infrastructure/persistence/local/schema/invite-team.record';
import { InviteRecord } from 'src/iam/invites/infrastructure/persistence/local/schema/invite.record';
import { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { LocalInvitesRepository } from './local-invites.repository';

const teamSchema = new EntitySchema<TeamRecord>({
  name: 'TeamRecord',
  target: TeamRecord,
  tableName: 'teams',
  columns: {
    id: { type: String, primary: true },
    name: { type: String },
    orgId: { type: String, name: 'org_id' },
  },
});

const inviteSchema = new EntitySchema<InviteRecord>({
  name: 'InviteRecord',
  target: InviteRecord,
  tableName: 'invites',
  columns: {
    id: { type: String, primary: true },
    email: { type: String },
    orgId: { type: String },
    role: { type: 'enum', enum: UserRole },
    acceptedAt: { type: 'timestamp', nullable: true },
    expiresAt: { type: 'timestamp' },
    createdAt: { type: 'timestamp' },
    updatedAt: { type: 'timestamp' },
  },
  relations: {
    inviteTeams: {
      type: 'one-to-many',
      target: 'InviteTeamRecord',
      inverseSide: 'invite',
    },
  },
});

const inviteTeamSchema = new EntitySchema<InviteTeamRecord>({
  name: 'InviteTeamRecord',
  target: InviteTeamRecord,
  tableName: 'invite_teams',
  columns: {
    id: { type: String, primary: true },
    inviteId: { type: String, name: 'invite_id' },
    teamId: { type: String, name: 'team_id' },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
  },
  relations: {
    invite: {
      type: 'many-to-one',
      target: 'InviteRecord',
      joinColumn: { name: 'invite_id' },
      inverseSide: 'inviteTeams',
      onDelete: 'CASCADE',
    },
    team: {
      type: 'many-to-one',
      target: 'TeamRecord',
      joinColumn: { name: 'team_id' },
    },
  },
});

describe('LocalInvitesRepository expired invite renewal', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let repository: LocalInvitesRepository;
  const orgId = randomUUID();
  const otherOrgId = randomUUID();
  const now = new Date('2026-06-01T12:00:00Z');
  const expired = new Date('2026-05-01T12:00:00Z');
  const valid = new Date('2026-06-08T12:00:00Z');
  const teamId = randomUUID();

  beforeAll(async () => {
    schemaName = `ayc1625_invites_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [teamSchema, inviteSchema, inviteTeamSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.release();
    await dataSource.synchronize();
    repository = new LocalInvitesRepository(new InviteMapper(), {
      tx: dataSource.manager,
    } as unknown as TransactionHost<TransactionalAdapterTypeOrm>);
    await dataSource
      .getRepository(TeamRecord)
      .insert({ id: teamId, name: 'Bauamt', orgId });
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.query(`DELETE FROM "${schemaName}".invite_teams`);
    await dataSource.query(`DELETE FROM "${schemaName}".invites`);
  });

  async function insertInvite(invite: {
    email: string;
    orgId?: UUID;
    expiresAt: Date;
    acceptedAt?: Date;
    teamIds?: UUID[];
  }): Promise<UUID> {
    const id = randomUUID();
    await dataSource.getRepository(InviteRecord).insert({
      id,
      email: invite.email,
      orgId: invite.orgId ?? orgId,
      role: UserRole.USER,
      expiresAt: invite.expiresAt,
      acceptedAt: invite.acceptedAt,
      createdAt: expired,
      updatedAt: expired,
    });
    for (const teamId of invite.teamIds ?? []) {
      await dataSource
        .getRepository(InviteTeamRecord)
        .insert({ id: randomUUID(), inviteId: id, teamId });
    }
    return id;
  }

  it('finds only expired, unaccepted invites of the organization', async () => {
    const expiredId = await insertInvite({
      email: 'expired@example.com',
      expiresAt: expired,
      teamIds: [teamId],
    });
    await insertInvite({ email: 'valid@example.com', expiresAt: valid });
    await insertInvite({
      email: 'accepted@example.com',
      expiresAt: expired,
      acceptedAt: expired,
    });
    await insertInvite({
      email: 'foreign@example.com',
      orgId: otherOrgId,
      expiresAt: expired,
    });

    const invites = await repository.findExpiredPendingByOrg(orgId, now);

    expect(invites.map((invite) => invite.id)).toEqual([expiredId]);
    expect(invites[0].teamIds).toEqual([teamId]);
  });

  it('deletes only the given invites that are still pending', async () => {
    const pendingId = await insertInvite({
      email: 'expired@example.com',
      expiresAt: expired,
      teamIds: [teamId],
    });
    const acceptedId = await insertInvite({
      email: 'accepted@example.com',
      expiresAt: expired,
      acceptedAt: expired,
    });
    const untouchedId = await insertInvite({
      email: 'other@example.com',
      expiresAt: expired,
    });

    const deletedIds = await repository.deletePendingByIds([
      pendingId,
      acceptedId,
      randomUUID(),
    ]);

    expect(deletedIds).toEqual([pendingId]);
    const remaining = await dataSource.getRepository(InviteRecord).find();
    expect(remaining.map((invite) => invite.id)).toEqual(
      expect.arrayContaining([acceptedId, untouchedId]),
    );
    expect(remaining).toHaveLength(2);
  });

  it('expires the given pending invites so they are found for resending', async () => {
    const renewedId = await insertInvite({
      email: 'renewed@example.com',
      expiresAt: valid,
    });
    const acceptedId = await insertInvite({
      email: 'accepted@example.com',
      expiresAt: valid,
      acceptedAt: expired,
    });
    await insertInvite({ email: 'other@example.com', expiresAt: valid });

    await repository.expirePendingByIds([renewedId, acceptedId], expired);

    const invites = await repository.findExpiredPendingByOrg(orgId, now);
    expect(invites.map((invite) => invite.id)).toEqual([renewedId]);
  });
});
