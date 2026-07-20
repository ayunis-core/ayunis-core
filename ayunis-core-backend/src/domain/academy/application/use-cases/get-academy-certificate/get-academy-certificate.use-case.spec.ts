import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { GetAcademyCertificateUseCase } from './get-academy-certificate.use-case';
import { GetAcademyCertificateQuery } from './get-academy-certificate.query';
import { AcademyCompletionRepository } from '../../ports/academy-completion.repository';
import { CertificateRendererPort } from '../../ports/certificate-renderer.port';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { AcademyCompletion } from 'src/domain/academy/domain/academy-completion.entity';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import {
  AcademyCompletionNotFoundError,
  UnexpectedAcademyError,
} from '../../academy.errors';

describe('GetAcademyCertificateUseCase', () => {
  let useCase: GetAcademyCertificateUseCase;
  let completionRepository: jest.Mocked<AcademyCompletionRepository>;
  let findUserByIdUseCase: jest.Mocked<FindUserByIdUseCase>;
  let certificateRenderer: jest.Mocked<CertificateRendererPort>;

  const userId = randomUUID();
  const user = new User({
    id: userId,
    email: 'käthe.müller@example.com',
    emailVerified: true,
    passwordHash: 'hash',
    role: UserRole.USER,
    orgId: randomUUID(),
    name: 'Käthe Müller',
    hasAcceptedMarketing: false,
  });

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    completionRepository = {
      findByUser: jest.fn(),
      upsert: jest.fn(),
    };
    findUserByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindUserByIdUseCase>;
    certificateRenderer = {
      render: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAcademyCertificateUseCase,
        {
          provide: AcademyCompletionRepository,
          useValue: completionRepository,
        },
        { provide: FindUserByIdUseCase, useValue: findUserByIdUseCase },
        { provide: CertificateRendererPort, useValue: certificateRenderer },
      ],
    }).compile();

    useCase = module.get(GetAcademyCertificateUseCase);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws AcademyCompletionNotFoundError when the academy is not completed', async () => {
    completionRepository.findByUser.mockResolvedValue(null);

    await expect(
      useCase.execute(new GetAcademyCertificateQuery({ userId })),
    ).rejects.toBeInstanceOf(AcademyCompletionNotFoundError);
    expect(certificateRenderer.render).not.toHaveBeenCalled();
  });

  it('renders the certificate with the user name and German date line', async () => {
    completionRepository.findByUser.mockResolvedValue(
      new AcademyCompletion({
        userId,
        completedAt: new Date('2026-07-15T10:00:00Z'),
      }),
    );
    findUserByIdUseCase.execute.mockResolvedValue(user);
    certificateRenderer.render.mockResolvedValue(Buffer.from('%PDF-fake'));

    const result = await useCase.execute(
      new GetAcademyCertificateQuery({ userId }),
    );

    expect(certificateRenderer.render).toHaveBeenCalledWith({
      userName: 'Käthe Müller',
      dateLine: '15. Juli 2026, München',
    });
    expect(result.buffer.toString()).toBe('%PDF-fake');
    expect(result.fileName).toBe('Ayunis-Core-KI-Fuehrerschein-Zertifikat.pdf');
    expect(result.mimeType).toBe('application/pdf');
  });

  it('wraps unexpected errors in UnexpectedAcademyError', async () => {
    completionRepository.findByUser.mockRejectedValue(new Error('db down'));

    await expect(
      useCase.execute(new GetAcademyCertificateQuery({ userId })),
    ).rejects.toBeInstanceOf(UnexpectedAcademyError);
  });
});
