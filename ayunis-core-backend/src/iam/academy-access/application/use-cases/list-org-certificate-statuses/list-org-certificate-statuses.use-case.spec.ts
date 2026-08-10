import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { FindAllUserSummariesByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-all-user-summaries-by-org-id/find-all-user-summaries-by-org-id.use-case';
import type { UserSummary } from 'src/iam/users/domain/user-summary';
import { GetAcademyCompletionsUseCase } from 'src/domain/academy/application/use-cases/get-academy-completions/get-academy-completions.use-case';
import type { AcademyCompletionView } from 'src/domain/academy/domain/academy-completion-view';
import { GetOrgAcademyAccessSettingsUseCase } from 'src/iam/academy-access/application/use-cases/get-org-academy-access-settings/get-org-academy-access-settings.use-case';
import { OrgAcademyAccessSettings } from 'src/iam/academy-access/domain/org-academy-access-settings.entity';
import { AcademyAccessMode } from 'src/iam/academy-access/domain/value-objects/academy-access-mode.enum';
import { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';
import { ListOrgCertificateStatusesUseCase } from './list-org-certificate-statuses.use-case';
import { ListOrgCertificateStatusesQuery } from './list-org-certificate-statuses.query';

describe('ListOrgCertificateStatusesUseCase', () => {
  let useCase: ListOrgCertificateStatusesUseCase;
  let getOrgSettingsUseCase: jest.Mocked<GetOrgAcademyAccessSettingsUseCase>;
  let findAllUserSummariesUseCase: jest.Mocked<FindAllUserSummariesByOrgIdUseCase>;
  let getAcademyCompletionsUseCase: jest.Mocked<GetAcademyCompletionsUseCase>;

  const orgId = randomUUID();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const anna = buildUser('Anna Admin', 'anna@example.com');
  const bruno = buildUser('Bruno Beispiel', 'bruno@example.com');
  const carla = buildUser('Carla Clerk', 'carla@example.com');

  function buildUser(name: string, email: string): UserSummary {
    return { id: randomUUID(), name, email };
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListOrgCertificateStatusesUseCase,
        {
          provide: GetOrgAcademyAccessSettingsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: FindAllUserSummariesByOrgIdUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetAcademyCompletionsUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(ListOrgCertificateStatusesUseCase);
    getOrgSettingsUseCase = module.get(GetOrgAcademyAccessSettingsUseCase);
    findAllUserSummariesUseCase = module.get(
      FindAllUserSummariesByOrgIdUseCase,
    );
    getAcademyCompletionsUseCase = module.get(GetAcademyCompletionsUseCase);

    withMode(AcademyAccessMode.REQUIRED_ANNUALLY);
    withUsers([anna, bruno, carla]);
    withCompletions(new Map());
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  function withMode(mode: AcademyAccessMode): void {
    getOrgSettingsUseCase.execute.mockResolvedValue(
      new OrgAcademyAccessSettings({ orgId, mode }),
    );
  }

  function withUsers(users: UserSummary[]): void {
    findAllUserSummariesUseCase.execute.mockResolvedValue(users);
  }

  function withCompletions(
    completions: Map<UUID, AcademyCompletionView>,
  ): void {
    getAcademyCompletionsUseCase.execute.mockResolvedValue(completions);
  }

  function completedDaysAgo(days: number): AcademyCompletionView {
    const completedAt = new Date(Date.now() - days * DAY_MS);
    return {
      completedAt,
      expiresAt: new Date(completedAt.getTime() + 365 * DAY_MS),
    };
  }

  function list(
    params: Partial<{
      search: string;
      status: CertificateValidityStatus;
      limit: number;
      offset: number;
    }> = {},
  ) {
    return useCase.execute(
      new ListOrgCertificateStatusesQuery({
        orgId,
        search: params.search,
        status: params.status,
        pagination: { limit: params.limit, offset: params.offset },
      }),
    );
  }

  it('reports members without a completion as not passed', async () => {
    const result = await list();

    expect(result.total).toBe(3);
    expect(result.data.map((entry) => entry.status)).toEqual([
      CertificateValidityStatus.NOT_PASSED,
      CertificateValidityStatus.NOT_PASSED,
      CertificateValidityStatus.NOT_PASSED,
    ]);
    expect(result.data.every((entry) => entry.completedAt === null)).toBe(true);
  });

  it('derives valid, expiring soon and expired from the completion dates', async () => {
    withCompletions(
      new Map([
        [anna.id, completedDaysAgo(10)],
        [bruno.id, completedDaysAgo(350)],
        [carla.id, completedDaysAgo(400)],
      ]),
    );

    const result = await list();
    const byEmail = new Map(result.data.map((e) => [e.email, e.status]));

    expect(byEmail.get(anna.email)).toBe(CertificateValidityStatus.VALID);
    expect(byEmail.get(bruno.email)).toBe(
      CertificateValidityStatus.EXPIRING_SOON,
    );
    expect(byEmail.get(carla.email)).toBe(CertificateValidityStatus.EXPIRED);
  });

  // A permanent pass never lapses, so an org on `required_once` must never see
  // one of its members flagged as expired.
  it('never reports an expiry when the org does not require renewal', async () => {
    withMode(AcademyAccessMode.REQUIRED_ONCE);
    withCompletions(new Map([[anna.id, completedDaysAgo(400)]]));

    const result = await list();
    const entry = result.data.find((e) => e.email === anna.email);

    expect(entry?.status).toBe(CertificateValidityStatus.VALID);
    expect(entry?.expiresAt).toBeNull();
  });

  it('orders the members an admin has to act on first', async () => {
    withCompletions(
      new Map([
        [anna.id, completedDaysAgo(10)],
        [carla.id, completedDaysAgo(400)],
      ]),
    );

    const result = await list();

    expect(result.data.map((entry) => entry.email)).toEqual([
      carla.email, // expired
      bruno.email, // not passed
      anna.email, // valid
    ]);
  });

  it('filters by status', async () => {
    withCompletions(new Map([[anna.id, completedDaysAgo(10)]]));

    const result = await list({ status: CertificateValidityStatus.NOT_PASSED });

    expect(result.total).toBe(2);
    expect(result.data.map((entry) => entry.email)).toEqual([
      bruno.email,
      carla.email,
    ]);
  });

  // Search touches only user fields, so the users module applies it in SQL and
  // this use case must not filter the result again — doing both would drop
  // members whose match the database already accepted.
  it('delegates the search to the member query', async () => {
    withUsers([bruno]);

    const result = await list({ search: 'BEISPIEL' });

    expect(findAllUserSummariesUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orgId, search: 'BEISPIEL' }),
    );
    expect(result.total).toBe(1);
    expect(result.data[0].email).toBe(bruno.email);
  });

  // The status filter runs before pagination, so the total has to describe the
  // filtered set — otherwise the admin table renders pages that do not exist.
  it('paginates the filtered set and reports its total', async () => {
    const result = await list({ limit: 2, offset: 2 });

    expect(result.total).toBe(3);
    expect(result.limit).toBe(2);
    expect(result.offset).toBe(2);
    expect(result.data).toHaveLength(1);
  });
});
