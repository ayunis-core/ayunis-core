import { parseCSV } from 'src/common/util/csv';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { OrgCertificateStatusesService } from 'src/iam/academy-access/application/services/org-certificate-statuses.service';
import type { OrgCertificateStatus } from 'src/iam/academy-access/application/models/org-certificate-status';
import { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';
import { UnexpectedAcademyAccessError } from 'src/iam/academy-access/application/academy-access.errors';
import { ExportOrgCertificateStatusesUseCase } from './export-org-certificate-statuses.use-case';
import { ExportOrgCertificateStatusesQuery } from './export-org-certificate-statuses.query';

describe('ExportOrgCertificateStatusesUseCase', () => {
  let useCase: ExportOrgCertificateStatusesUseCase;
  let statusesService: jest.Mocked<OrgCertificateStatusesService>;

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportOrgCertificateStatusesUseCase,
        {
          provide: OrgCertificateStatusesService,
          useValue: { findAll: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(ExportOrgCertificateStatusesUseCase);
    statusesService = module.get(OrgCertificateStatusesService);
  });

  afterEach(() => jest.clearAllMocks());

  it('writes one row per member with German dates and status labels', async () => {
    statusesService.findAll.mockResolvedValue([
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
      new ExportOrgCertificateStatusesQuery({ orgId }),
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
    statusesService.findAll.mockResolvedValue([
      buildStatus({
        completedAt: new Date('2026-01-15T12:00:00Z'),
        expiresAt: null,
        status: CertificateValidityStatus.VALID,
      }),
    ]);

    const csv = await useCase.execute(
      new ExportOrgCertificateStatusesQuery({ orgId }),
    );

    expect(csv.split('\n')[1]).toBe(
      '"Anna Schmidt","anna@example.com","Gültig","15.01.2026",""',
    );
  });

  it('neutralizes formula prefixes in member-controlled cells', async () => {
    statusesService.findAll.mockResolvedValue([
      buildStatus({ name: '=HYPERLINK("x")', email: '@attacker@example.com' }),
    ]);

    const csv = await useCase.execute(
      new ExportOrgCertificateStatusesQuery({ orgId }),
    );

    expect(csv.split('\n')[1]).toBe(
      '"\'=HYPERLINK(""x"")","\'@attacker@example.com","Noch nicht abgeschlossen","",""',
    );
  });

  it('preserves quoted, multiline, and Unicode member names in exported cells', async () => {
    const name = 'Müller, "Anna"\nBürgerbüro';
    statusesService.findAll.mockResolvedValue([buildStatus({ name })]);
    const csv = await useCase.execute(
      new ExportOrgCertificateStatusesQuery({ orgId }),
    );
    expect(parseCSV(csv).data[0][0]).toBe(name);
  });

  it('passes the active search and status filter through to the member list', async () => {
    statusesService.findAll.mockResolvedValue([]);

    const csv = await useCase.execute(
      new ExportOrgCertificateStatusesQuery({
        orgId,
        search: 'anna',
        status: CertificateValidityStatus.EXPIRED,
      }),
    );

    expect(statusesService.findAll).toHaveBeenCalledWith({
      orgId,
      search: 'anna',
      status: CertificateValidityStatus.EXPIRED,
    });
    expect(csv.split('\n').filter(Boolean)).toEqual([HEADER]);
  });

  it('wraps unexpected errors in UnexpectedAcademyAccessError', async () => {
    statusesService.findAll.mockRejectedValue(new Error('db down'));

    await expect(
      useCase.execute(new ExportOrgCertificateStatusesQuery({ orgId })),
    ).rejects.toBeInstanceOf(UnexpectedAcademyAccessError);
  });
});
