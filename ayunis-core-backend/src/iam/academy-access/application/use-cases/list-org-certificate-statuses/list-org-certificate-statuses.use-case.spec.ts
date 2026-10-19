import { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';
import { randomUUID } from 'crypto';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { OrgCertificateStatusesService } from 'src/iam/academy-access/application/services/org-certificate-statuses.service';
import { ListOrgCertificateStatusesUseCase } from './list-org-certificate-statuses.use-case';
import { ListOrgCertificateStatusesQuery } from './list-org-certificate-statuses.query';

describe('ListOrgCertificateStatusesUseCase', () => {
  it('returns the database page and count without loading or paginating the whole list', async () => {
    const page = new Paginated({ data: [], limit: 25, offset: 100, total: 80 });
    const service = { findPage: jest.fn().mockResolvedValue(page) };
    const useCase = new ListOrgCertificateStatusesUseCase(
      service as unknown as OrgCertificateStatusesService,
    );
    const orgId = randomUUID();
    const result = await useCase.execute(
      new ListOrgCertificateStatusesQuery({
        orgId,
        search: 'anna',
        status: CertificateValidityStatus.EXPIRED,
        pagination: { limit: 25, offset: 100 },
      }),
    );
    expect(result).toBe(page);
    expect(service.findPage).toHaveBeenCalledWith(
      { orgId, search: 'anna', status: CertificateValidityStatus.EXPIRED },
      { limit: 25, offset: 100 },
    );
  });
});
