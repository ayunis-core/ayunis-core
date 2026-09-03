import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { randomUUID } from 'crypto';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import type { ConfigService } from '@nestjs/config';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { RegisterUserUseCase } from './register-user.use-case';
import { RegisterUserCommand } from './register-user.command';
import { UnexpectedAuthenticationError } from 'src/iam/authentication/application/authentication.errors';
import type { FindUserByEmailUseCase } from 'src/iam/users/application/use-cases/find-user-by-email/find-user-by-email.use-case';
import type { CreateAdminUserUseCase } from 'src/iam/users/application/use-cases/create-admin-user/create-admin-user.use-case';
import type { IsValidPasswordUseCase } from 'src/iam/users/application/use-cases/is-valid-password/is-valid-password.use-case';
import { CreateOrgUseCase } from 'src/iam/orgs/application/use-cases/create-org/create-org.use-case';
import { CreateOrgCommand } from 'src/iam/orgs/application/use-cases/create-org/create-org.command';
import type { CreateLegalAcceptanceUseCase } from 'src/iam/legal-acceptances/application/use-cases/create-legal-acceptance/create-legal-acceptance.use-case';
import type { SendConfirmationEmailUseCase } from 'src/iam/users/application/use-cases/send-confirmation-email/send-confirmation-email.use-case';
import type { CreateTrialUseCase } from 'src/iam/trials/application/use-cases/create-trial/create-trial.use-case';
import type { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import { LocalOrgsRepository } from 'src/iam/orgs/infrastructure/repositories/local/local-orgs.repository';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import type { RolePermissionsRepository } from 'src/iam/permissions/application/ports/role-permissions.repository';
import { LocalRolePermissionsRepository } from 'src/iam/permissions/infrastructure/persistence/local/local-role-permissions.repository';
import { RolePermissionRecord } from 'src/iam/permissions/infrastructure/persistence/local/schema/role-permission.record';
import { SeedDefaultRolePermissionsUseCase } from 'src/iam/permissions/application/use-cases/seed-default-role-permissions/seed-default-role-permissions.use-case';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { User } from 'src/iam/users/domain/user.entity';
import { Trial } from 'src/iam/trials/domain/trial.entity';

const orgRecordSchema = new EntitySchema<OrgRecord>({
  name: 'OrgRecord',
  target: OrgRecord,
  tableName: 'orgs',
  columns: {
    id: { type: 'uuid', primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    name: { type: String },
  },
});

const rolePermissionRecordSchema = new EntitySchema<RolePermissionRecord>({
  name: 'RolePermissionRecord',
  target: RolePermissionRecord,
  tableName: 'role_permissions',
  columns: {
    id: { type: 'uuid', primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    orgId: { type: 'uuid' },
    role: { type: 'enum', enum: UserRole },
    permission: { type: 'enum', enum: Permission },
  },
});

describe('RegisterUserUseCase transaction', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let txHost: TransactionHost<TransactionalAdapterTypeOrm>;
  let useCase: RegisterUserUseCase;
  let orgsRepository: OrgsRepository;
  let orgName: string;
  let emailsConfigured: boolean;
  const createAdminUserUseCase = {
    execute: jest.fn(),
  } as jest.Mocked<Pick<CreateAdminUserUseCase, 'execute'>>;
  const createTrialUseCase = {
    execute: jest.fn(),
  } as jest.Mocked<Pick<CreateTrialUseCase, 'execute'>>;
  const sendConfirmationEmailUseCase = {
    execute: jest.fn(),
  } as jest.Mocked<Pick<SendConfirmationEmailUseCase, 'execute'>>;

  beforeAll(async () => {
    schemaName = `ayc_627_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [orgRecordSchema, rolePermissionRecordSchema],
      migrations: [],
      migrationsRun: false,
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.release();
    await dataSource.synchronize();

    const adapter = new TransactionalAdapterTypeOrm({
      dataSourceToken: DataSource,
    });
    txHost = new TransactionHost<TransactionalAdapterTypeOrm>({
      ...adapter.optionsFactory(dataSource),
      connectionName: undefined,
      enableTransactionProxy: false,
      defaultTxOptions: {},
      extraProviderTokens: [],
    });
    orgsRepository = new LocalOrgsRepository(txHost);
    const rolePermissionsRepository: RolePermissionsRepository =
      new LocalRolePermissionsRepository(dataSource, txHost);
    const seedDefaultRolePermissionsUseCase =
      new SeedDefaultRolePermissionsUseCase(rolePermissionsRepository);
    const createOrgUseCase = new CreateOrgUseCase(
      orgsRepository,
      {
        emitAsync: jest.fn().mockResolvedValue([]),
      } as unknown as EventEmitter2,
      seedDefaultRolePermissionsUseCase,
    );

    useCase = new RegisterUserUseCase(
      {
        execute: jest.fn().mockResolvedValue(null),
      } as unknown as FindUserByEmailUseCase,
      createAdminUserUseCase as unknown as CreateAdminUserUseCase,
      {
        execute: jest.fn().mockResolvedValue(true),
      } as unknown as IsValidPasswordUseCase,
      createOrgUseCase,
      { execute: jest.fn() } as unknown as CreateLegalAcceptanceUseCase,
      sendConfirmationEmailUseCase as unknown as SendConfirmationEmailUseCase,
      createTrialUseCase as unknown as CreateTrialUseCase,
      {
        get: jest.fn((key: string): unknown => {
          if (key === 'subscriptions.trialMaxMessages') return 100;
          if (key === 'emails.hasConfig') return emailsConfigured;
          return false;
        }),
      } as unknown as ConfigService,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    orgName = `Atomic Registration ${randomUUID()}`;
    emailsConfigured = false;
    createTrialUseCase.execute.mockRejectedValue(
      new Error('trial insert failed'),
    );
  });

  afterEach(async () => {
    if (dataSource.isInitialized) {
      await dataSource.getRepository(OrgRecord).delete({ name: orgName });
    }
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  });

  it('rolls back the organization when registration fails after its insert', async () => {
    await expect(
      useCase.execute(
        new RegisterUserCommand({
          userName: 'Ada Lovelace',
          email: `atomic-${randomUUID()}@example.com`,
          password: 'Valid-Password-123',
          orgName,
          hasAcceptedMarketing: false,
        }),
      ),
    ).rejects.toBeInstanceOf(UnexpectedAuthenticationError);

    const persistedOrg = await dataSource
      .getRepository(OrgRecord)
      .findOneBy({ name: orgName });
    expect(persistedOrg).toBeNull();
  });

  it('sends the confirmation email after the registration transaction commits', async () => {
    emailsConfigured = true;
    createTrialUseCase.execute.mockImplementation(
      async (command) =>
        new Trial({
          orgId: command.orgId,
          maxMessages: command.maxMessages,
          messagesSent: 0,
        }),
    );
    createAdminUserUseCase.execute.mockImplementation(
      async (command) =>
        new User({
          email: command.email,
          emailVerified: false,
          passwordHash: 'hashed-password',
          role: UserRole.ADMIN,
          orgId: command.orgId,
          name: command.name,
          hasAcceptedMarketing: command.hasAcceptedMarketing,
        }),
    );
    let emailTransactionActive: boolean | undefined;
    sendConfirmationEmailUseCase.execute.mockImplementation(async () => {
      emailTransactionActive = txHost.isTransactionActive();
    });

    await useCase.execute(
      new RegisterUserCommand({
        userName: 'Grace Hopper',
        email: `confirmation-${randomUUID()}@example.com`,
        password: 'Valid-Password-123',
        orgName,
        hasAcceptedMarketing: false,
      }),
    );

    expect(emailTransactionActive).toBe(false);
  });

  it('rolls back a standalone organization when permission seeding fails', async () => {
    const createOrgUseCase = new CreateOrgUseCase(
      orgsRepository,
      {
        emitAsync: jest.fn().mockResolvedValue([]),
      } as unknown as EventEmitter2,
      {
        execute: jest
          .fn()
          .mockRejectedValue(new Error('permission seeding failed')),
      } as unknown as SeedDefaultRolePermissionsUseCase,
    );

    await expect(
      createOrgUseCase.execute(new CreateOrgCommand(orgName)),
    ).rejects.toThrow();

    const persistedOrg = await dataSource
      .getRepository(OrgRecord)
      .findOneBy({ name: orgName });
    expect(persistedOrg).toBeNull();
  });
});
