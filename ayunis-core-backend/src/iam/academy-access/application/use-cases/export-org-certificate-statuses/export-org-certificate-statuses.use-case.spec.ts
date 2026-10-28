import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { parseCSV } from 'src/common/util/csv';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { OrgCertificateStatusesRepository } from 'src/iam/academy-access/application/ports/org-certificate-statuses.repository';
import { GetOrgAcademyAccessSettingsUseCase } from 'src/iam/academy-access/application/use-cases/get-org-academy-access-settings/get-org-academy-access-settings.use-case';
import { GetOrgAcademyAccessSettingsQuery } from 'src/iam/academy-access/application/use-cases/get-org-academy-access-settings/get-org-academy-access-settings.query';
import { OrgAcademyAccessSettings } from 'src/iam/academy-access/domain/org-academy-access-settings.entity';
import { AcademyAccessMode } from 'src/iam/academy-access/domain/value-objects/academy-access-mode.enum';
import type { OrgCertificateStatus } from 'src/iam/academy-access/application/models/org-certificate-status';
import { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';
import { UnexpectedAcademyAccessError } from 'src/iam/academy-access/application/academy-access.errors';
import { ExportOrgCertificateStatusesUseCase } from './export-org-certificate-statuses.use-case';
import { ExportOrgCertificateStatusesQuery } from './export-org-certificate-statuses.query';

describe('ExportOrgCertificateStatusesUseCase', () => {
  let useCase: ExportOrgCertificateStatusesUseCase;
  let repository: jest.Mocked<OrgCertificateStatusesRepository>;
  const context = { get: jest.fn() };
  const settings = { execute: jest.fn() };

  const orgId = randomUUID();
  const HEADER =
    '\uFEFF"Name","E-Mail","Status","Zuletzt abgeschlossen","Erneuerung fällig"';

  function buildStatus(
    overrides: Partial<OrgCertificateStatus>,
  ): OrgCertificateStatus {
    return {
      userId: randomUUID(),
      name: 'Anna Schmidt',
      email: 'anna@example.com',
      completedAt: null,
      expiresAt: null,
      status: CertificateValidityStatus.NOT_PASSED,
      ...overrides,
    };
  }

  beforeEach(async () => {
    context.get.mockReturnValue(orgId);
    settings.execute.mockResolvedValue(
      new OrgAcademyAccessSettings({
        orgId,
        mode: AcademyAccessMode.REQUIRED_ANNUALLY,
      }),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportOrgCertificateStatusesUseCase,
        {
          provide: OrgCertificateStatusesRepository,
          useValue: { findAll: jest.fn(), findPage: jest.fn() },
        },
        { provide: ContextService, useValue: context },
        { provide: GetOrgAcademyAccessSettingsUseCase, useValue: settings },
      ],
    }).compile();

    useCase = module.get(ExportOrgCertificateStatusesUseCase);
    repository = module.get(OrgCertificateStatusesRepository);
  });

  afterEach(() => jest.clearAllMocks());

  it('writes one row per member with German dates and status labels', async () => {
    repository.findAll.mockResolvedValue([
      buildStatus({
        name: 'Dan Becker',
        email: 'dan@example.com',
        completedAt: new Date('2025-06-30T22:30:00Z'),
        expiresAt: new Date('2026-06-30T22:30:00Z'),
        status: CertificateValidityStatus.EXPIRED,
      }),
      buildStatus({
        name: 'Anna Schmidt',
        email: 'anna@example.com',
        completedAt: new Date('2026-09-26T10:00:00Z'),
        expiresAt: new Date('2027-09-26T10:00:00Z'),
        status: CertificateValidityStatus.VALID,
      }),
      buildStatus({ name: 'Ben Müller', email: 'ben@example.com' }),
    ]);

    const csv = await useCase.execute(
      new ExportOrgCertificateStatusesQuery({}),
    );

    expect(Buffer.from(csv).subarray(0, 3)).toEqual(
      Buffer.from([0xef, 0xbb, 0xbf]),
    );
    expect(csv).toBe(
      [
        HEADER,
        '"Dan Becker","dan@example.com","Abgelaufen","01.07.2025","01.07.2026"',
        '"Anna Schmidt","anna@example.com","Gültig","26.09.2026","26.09.2027"',
        '"Ben Müller","ben@example.com","Noch nicht abgeschlossen","",""',
      ].join('\n'),
    );
  });

  // The column is part of the file format in every mode: a reader must not have
  // to know the org's renewal setting to interpret the file.
  it('keeps the renewal column empty when no renewal applies', async () => {
    repository.findAll.mockResolvedValue([
      buildStatus({
        completedAt: new Date('2026-01-15T12:00:00Z'),
        expiresAt: null,
        status: CertificateValidityStatus.VALID,
      }),
    ]);

    const csv = await useCase.execute(
      new ExportOrgCertificateStatusesQuery({}),
    );

    expect(csv.split('\n')[1]).toBe(
      '"Anna Schmidt","anna@example.com","Gültig","15.01.2026",""',
    );
  });

  it('neutralizes formula prefixes in member-controlled cells', async () => {
    repository.findAll.mockResolvedValue([
      buildStatus({ name: '=HYPERLINK("x")', email: '@attacker@example.com' }),
    ]);

    const csv = await useCase.execute(
      new ExportOrgCertificateStatusesQuery({}),
    );

    expect(csv.split('\n')[1]).toBe(
      '"\'=HYPERLINK(""x"")","\'@attacker@example.com","Noch nicht abgeschlossen","",""',
    );
  });

  it('preserves quoted, multiline, and Unicode member names in exported cells', async () => {
    const name = 'Müller, "Anna"\nBürgerbüro';
    repository.findAll.mockResolvedValue([buildStatus({ name })]);
    const csv = await useCase.execute(
      new ExportOrgCertificateStatusesQuery({}),
    );
    expect(parseCSV(csv).data[0][0]).toBe(name);
  });

  it('passes the active search and status filter through to the member list', async () => {
    repository.findAll.mockResolvedValue([]);

    const csv = await useCase.execute(
      new ExportOrgCertificateStatusesQuery({
        search: 'anna',
        status: CertificateValidityStatus.EXPIRED,
      }),
    );

    expect(repository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId,
        search: 'anna',
        status: CertificateValidityStatus.EXPIRED,
      }),
    );
    expect(settings.execute).toHaveBeenCalledWith(
      new GetOrgAcademyAccessSettingsQuery(orgId),
    );
    expect(csv.split('\n').filter(Boolean)).toEqual([HEADER]);
  });

  it('wraps unexpected errors in UnexpectedAcademyAccessError', async () => {
    repository.findAll.mockRejectedValue(new Error('db down'));

    await expect(
      useCase.execute(new ExportOrgCertificateStatusesQuery({})),
    ).rejects.toBeInstanceOf(UnexpectedAcademyAccessError);
  });
  it('rejects missing organization context before loading certificate data', async () => {
    context.get.mockReturnValue(undefined);
    repository.findAll.mockResolvedValue([]);
    await expect(
      useCase.execute(new ExportOrgCertificateStatusesQuery({})),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(repository.findAll).not.toHaveBeenCalled();
    expect(settings.execute).not.toHaveBeenCalled();
  });

  it.each([orgId, randomUUID()])(
    'scopes independent caller %s and ignores an injected organization',
    async (callerOrgId) => {
      context.get.mockReturnValue(callerOrgId);
      repository.findAll.mockResolvedValue([]);
      const query = Object.assign(new ExportOrgCertificateStatusesQuery({}), {
        orgId: randomUUID(),
      });
      await useCase.execute(query);
      expect(settings.execute).toHaveBeenCalledWith(
        new GetOrgAcademyAccessSettingsQuery(callerOrgId),
      );
      expect(repository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: callerOrgId }),
      );
    },
  );
});
