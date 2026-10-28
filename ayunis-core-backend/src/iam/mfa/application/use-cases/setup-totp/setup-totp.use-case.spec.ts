import type { UserTotpsRepository } from 'src/iam/mfa/application/ports/user-totps.repository';
import type { TotpSecretEncryptionPort } from 'src/iam/mfa/application/ports/totp-secret-encryption.port';
import type { TotpPort } from 'src/iam/mfa/application/ports/totp.port';
import { SetupTotpCommand } from 'src/iam/mfa/application/use-cases/setup-totp/setup-totp.command';
import { SetupTotpUseCase } from 'src/iam/mfa/application/use-cases/setup-totp/setup-totp.use-case';

describe(SetupTotpUseCase.name, () => {
  const repository = { findByUserId: jest.fn(), upsert: jest.fn() };
  const encryption = { encrypt: jest.fn() };
  const totp = {
    generateSecret: jest.fn(),
    buildOtpauthUri: jest.fn(),
    generateQrDataUri: jest.fn(),
  };
  const useCase = new SetupTotpUseCase(
    repository as unknown as UserTotpsRepository,
    encryption as unknown as TotpSecretEncryptionPort,
    totp as unknown as TotpPort,
  );

  it('returns service unavailable when PostgreSQL cannot load enrollment', async () => {
    repository.findByUserId.mockRejectedValue(
      Object.assign(new Error('connection refused'), {
        code: 'ECONNREFUSED',
      }),
    );

    await expect(
      useCase.execute(
        new SetupTotpCommand(
          'f532bbf9-1f0a-4a8d-b08b-4f2e8da09a7e',
          'maria@stadt.example',
        ),
      ),
    ).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
    });
  });
});
