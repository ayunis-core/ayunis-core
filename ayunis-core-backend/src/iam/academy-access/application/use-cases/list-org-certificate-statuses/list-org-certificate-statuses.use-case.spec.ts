import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { OrgCertificateStatusesRepository } from 'src/iam/academy-access/application/ports/org-certificate-statuses.repository';
import { GetOrgAcademyAccessSettingsUseCase } from 'src/iam/academy-access/application/use-cases/get-org-academy-access-settings/get-org-academy-access-settings.use-case';
import { GetOrgAcademyAccessSettingsQuery } from 'src/iam/academy-access/application/use-cases/get-org-academy-access-settings/get-org-academy-access-settings.query';
import { OrgAcademyAccessSettings } from 'src/iam/academy-access/domain/org-academy-access-settings.entity';
import { AcademyAccessMode } from 'src/iam/academy-access/domain/value-objects/academy-access-mode.enum';
import { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';
import { ListOrgCertificateStatusesUseCase } from './list-org-certificate-statuses.use-case';
import { ListOrgCertificateStatusesQuery } from './list-org-certificate-statuses.query';

const NOW = new Date('2025-03-30T12:00:00Z');

describe('ListOrgCertificateStatusesUseCase', () => {
  const orgId = randomUUID();
  const context = { get: jest.fn() };
  const settings = { execute: jest.fn() };
  const repository = { findAll: jest.fn(), findPage: jest.fn() };
  let useCase: ListOrgCertificateStatusesUseCase;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);
    context.get.mockReturnValue(orgId);
    settings.execute.mockResolvedValue(
      new OrgAcademyAccessSettings({
        orgId,
        mode: AcademyAccessMode.REQUIRED_ANNUALLY,
      }),
    );
    const module = await Test.createTestingModule({
      providers: [
        ListOrgCertificateStatusesUseCase,
        { provide: OrgCertificateStatusesRepository, useValue: repository },
        { provide: ContextService, useValue: context },
        { provide: GetOrgAcademyAccessSettingsUseCase, useValue: settings },
      ],
    }).compile();
    useCase = module.get(ListOrgCertificateStatusesUseCase);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('returns the database page and count using the caller organization and one clock', async () => {
    const page = new Paginated({ data: [], limit: 25, offset: 100, total: 80 });
    repository.findPage.mockResolvedValue(page);
    const result = await useCase.execute(
      new ListOrgCertificateStatusesQuery({
        search: 'anna',
        status: CertificateValidityStatus.EXPIRED,
        pagination: { limit: 25, offset: 100 },
      }),
    );
    expect(result).toBe(page);
    expect(settings.execute).toHaveBeenCalledWith(
      new GetOrgAcademyAccessSettingsQuery(orgId),
    );
    expect(repository.findPage).toHaveBeenCalledWith(
      {
        orgId,
        search: 'anna',
        status: CertificateValidityStatus.EXPIRED,
        renewalRequired: true,
        validityMonths: 12,
        now: NOW,
        expiringSoonUntil: new Date('2025-04-29T12:00:00Z'),
      },
      { limit: 25, offset: 100 },
    );
    expect(repository.findAll).not.toHaveBeenCalled();
  });

  it('rejects missing organization context before reading settings or members', async () => {
    context.get.mockReturnValue(undefined);
    await expect(
      useCase.execute(new ListOrgCertificateStatusesQuery({})),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(settings.execute).not.toHaveBeenCalled();
    expect(repository.findPage).not.toHaveBeenCalled();
  });

  it.each([orgId, randomUUID()])(
    'scopes an independent caller %s and ignores an injected organization',
    async (callerOrgId) => {
      context.get.mockReturnValue(callerOrgId);
      repository.findPage.mockResolvedValue(
        new Paginated({ data: [], limit: 25, offset: 0 }),
      );
      const query = Object.assign(new ListOrgCertificateStatusesQuery({}), {
        orgId: randomUUID(),
      });
      await useCase.execute(query);
      expect(settings.execute).toHaveBeenCalledWith(
        new GetOrgAcademyAccessSettingsQuery(callerOrgId),
      );
      expect(repository.findPage).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: callerOrgId }),
        { limit: 25, offset: 0 },
      );
    },
  );
});
