import { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';
import { randomUUID } from 'crypto';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { GetOrgAcademyAccessSettingsUseCase } from 'src/iam/academy-access/application/use-cases/get-org-academy-access-settings/get-org-academy-access-settings.use-case';
import { OrgAcademyAccessSettings } from 'src/iam/academy-access/domain/org-academy-access-settings.entity';
import { AcademyAccessMode } from 'src/iam/academy-access/domain/value-objects/academy-access-mode.enum';
import { OrgCertificateStatusesService } from './org-certificate-statuses.service';

const NOW = new Date('2025-03-30T12:00:00Z');

describe('OrgCertificateStatusesService', () => {
  const orgId = randomUUID();
  const settings = { execute: jest.fn() };
  const repository = { findAll: jest.fn(), findPage: jest.fn() };
  let service: OrgCertificateStatusesService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    settings.execute.mockResolvedValue(
      new OrgAcademyAccessSettings({
        orgId,
        mode: AcademyAccessMode.REQUIRED_ANNUALLY,
      }),
    );
    service = new OrgCertificateStatusesService(
      settings as unknown as GetOrgAcademyAccessSettingsUseCase,
      repository,
    );
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('loads only the requested page with a single captured validity clock', async () => {
    const page = new Paginated({ data: [], limit: 25, offset: 50, total: 100 });
    repository.findPage.mockResolvedValue(page);
    expect(
      await service.findPage(
        { orgId, search: 'anna', status: CertificateValidityStatus.EXPIRED },
        { limit: 25, offset: 50 },
      ),
    ).toBe(page);
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
      { limit: 25, offset: 50 },
    );
    expect(repository.findAll).not.toHaveBeenCalled();
  });

  it.each([AcademyAccessMode.REQUIRED_ONCE, AcademyAccessMode.UNRESTRICTED])(
    'exports without renewal for mode %s',
    async (mode) => {
      settings.execute.mockResolvedValue(
        new OrgAcademyAccessSettings({ orgId, mode }),
      );
      repository.findAll.mockResolvedValue([]);
      expect(await service.findAll({ orgId })).toEqual([]);
      expect(repository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ renewalRequired: false }),
      );
    },
  );
});
