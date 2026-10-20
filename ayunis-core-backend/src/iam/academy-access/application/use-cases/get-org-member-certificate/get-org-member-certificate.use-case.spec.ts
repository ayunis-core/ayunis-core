import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { GetAcademyCertificateUseCase } from 'src/domain/academy/application/use-cases/get-academy-certificate/get-academy-certificate.use-case';
import { AcademyCompletionNotFoundError } from 'src/domain/academy/application/academy.errors';
import {
  OrgMemberNotFoundError,
  UnexpectedAcademyAccessError,
} from 'src/iam/academy-access/application/academy-access.errors';
import { GetOrgMemberCertificateUseCase } from './get-org-member-certificate.use-case';
import { GetOrgMemberCertificateQuery } from './get-org-member-certificate.query';

describe('GetOrgMemberCertificateUseCase', () => {
  let useCase: GetOrgMemberCertificateUseCase;
  let findUsersByIdsUseCase: jest.Mocked<FindUsersByIdsUseCase>;
  let getAcademyCertificateUseCase: jest.Mocked<GetAcademyCertificateUseCase>;

  const orgId = randomUUID();
  const memberId = randomUUID();
  const member = new User({
    id: memberId,
    email: 'anna@example.com',
    emailVerified: true,
    passwordHash: 'hash',
    role: UserRole.USER,
    orgId,
    name: 'Anna Schmidt',
    hasAcceptedMarketing: false,
  });
  const certificate = {
    buffer: Buffer.from('%PDF-fake'),
    fileName: 'Teilnahmebestaetigung_Ayunis_Core_KI-Schulung.pdf',
    mimeType: 'application/pdf',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetOrgMemberCertificateUseCase,
        { provide: FindUsersByIdsUseCase, useValue: { execute: jest.fn() } },
        {
          provide: GetAcademyCertificateUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetOrgMemberCertificateUseCase);
    findUsersByIdsUseCase = module.get(FindUsersByIdsUseCase);
    getAcademyCertificateUseCase = module.get(GetAcademyCertificateUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it("renders the member's own certificate when they belong to the admin's org", async () => {
    findUsersByIdsUseCase.execute.mockResolvedValue([member]);
    getAcademyCertificateUseCase.execute.mockResolvedValue(certificate);

    const result = await useCase.execute(
      new GetOrgMemberCertificateQuery({ orgId, userId: memberId }),
    );

    expect(result).toBe(certificate);
    expect(getAcademyCertificateUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: memberId }),
    );
  });

  // The org-scoped lookup answers "not a member" for an unknown id and for a
  // member of another org alike, so an admin cannot probe whether a user id
  // exists elsewhere.
  it('rejects a user outside the org without rendering anything', async () => {
    findUsersByIdsUseCase.execute.mockResolvedValue([]);

    await expect(
      useCase.execute(
        new GetOrgMemberCertificateQuery({ orgId, userId: memberId }),
      ),
    ).rejects.toBeInstanceOf(OrgMemberNotFoundError);
    expect(getAcademyCertificateUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects a member of another org even when the lookup returns them', async () => {
    findUsersByIdsUseCase.execute.mockResolvedValue([
      new User({ ...member, orgId: randomUUID() }),
    ]);

    await expect(
      useCase.execute(
        new GetOrgMemberCertificateQuery({ orgId, userId: memberId }),
      ),
    ).rejects.toBeInstanceOf(OrgMemberNotFoundError);
    expect(getAcademyCertificateUseCase.execute).not.toHaveBeenCalled();
  });

  it('passes a missing completion through as the academy reports it', async () => {
    findUsersByIdsUseCase.execute.mockResolvedValue([member]);
    getAcademyCertificateUseCase.execute.mockRejectedValue(
      new AcademyCompletionNotFoundError({ userId: memberId }),
    );

    await expect(
      useCase.execute(
        new GetOrgMemberCertificateQuery({ orgId, userId: memberId }),
      ),
    ).rejects.toBeInstanceOf(AcademyCompletionNotFoundError);
  });

  it('wraps unexpected errors in UnexpectedAcademyAccessError', async () => {
    findUsersByIdsUseCase.execute.mockRejectedValue(new Error('db down'));

    await expect(
      useCase.execute(
        new GetOrgMemberCertificateQuery({ orgId, userId: memberId }),
      ),
    ).rejects.toBeInstanceOf(UnexpectedAcademyAccessError);
  });
});
