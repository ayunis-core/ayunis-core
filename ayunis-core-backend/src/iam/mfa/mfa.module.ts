import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HashingModule } from '../hashing/hashing.module';
import { UsersModule } from '../users/users.module';
import { UserTotpRecord } from './infrastructure/repositories/local/schema/user-totp.record';
import { MfaRecoveryCodeRecord } from './infrastructure/repositories/local/schema/mfa-recovery-code.record';
import { OrgMfaRequirementRecord } from './infrastructure/repositories/local/schema/org-mfa-requirement.record';
import { UserTotpsRepository } from './application/ports/user-totps.repository';
import { LocalUserTotpsRepository } from './infrastructure/repositories/local/local-user-totps.repository';
import { MfaRecoveryCodesRepository } from './application/ports/mfa-recovery-codes.repository';
import { LocalMfaRecoveryCodesRepository } from './infrastructure/repositories/local/local-mfa-recovery-codes.repository';
import { OrgMfaRequirementsRepository } from './application/ports/org-mfa-requirements.repository';
import { LocalOrgMfaRequirementsRepository } from './infrastructure/repositories/local/local-org-mfa-requirements.repository';
import { TotpSecretEncryptionPort } from './application/ports/totp-secret-encryption.port';
import { TotpSecretEncryptionService } from './infrastructure/encryption/totp-secret-encryption.service';
import { TotpPort } from './application/ports/totp.port';
import { OtplibTotpAdapter } from './infrastructure/totp/otplib-totp.adapter';
import { SetupTotpUseCase } from './application/use-cases/setup-totp/setup-totp.use-case';
import { ConfirmTotpUseCase } from './application/use-cases/confirm-totp/confirm-totp.use-case';
import { GetMfaStatusUseCase } from './application/use-cases/get-mfa-status/get-mfa-status.use-case';
import { VerifyMfaCodeUseCase } from './application/use-cases/verify-mfa-code/verify-mfa-code.use-case';
import { DisableMfaUseCase } from './application/use-cases/disable-mfa/disable-mfa.use-case';
import { GetOrgMfaRequirementUseCase } from './application/use-cases/get-org-mfa-requirement/get-org-mfa-requirement.use-case';
import { UpsertOrgMfaRequirementUseCase } from './application/use-cases/upsert-org-mfa-requirement/upsert-org-mfa-requirement.use-case';
import { ResetUserMfaUseCase } from './application/use-cases/reset-user-mfa/reset-user-mfa.use-case';
import { CheckMfaLoginRequirementUseCase } from './application/use-cases/check-mfa-login-requirement/check-mfa-login-requirement.use-case';
import { MfaController } from './presenters/http/mfa.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserTotpRecord,
      MfaRecoveryCodeRecord,
      OrgMfaRequirementRecord,
    ]),
    HashingModule,
    UsersModule,
  ],
  controllers: [MfaController],
  providers: [
    {
      provide: UserTotpsRepository,
      useClass: LocalUserTotpsRepository,
    },
    {
      provide: MfaRecoveryCodesRepository,
      useClass: LocalMfaRecoveryCodesRepository,
    },
    {
      provide: OrgMfaRequirementsRepository,
      useClass: LocalOrgMfaRequirementsRepository,
    },
    {
      provide: TotpSecretEncryptionPort,
      useClass: TotpSecretEncryptionService,
    },
    {
      provide: TotpPort,
      useClass: OtplibTotpAdapter,
    },
    SetupTotpUseCase,
    ConfirmTotpUseCase,
    GetMfaStatusUseCase,
    VerifyMfaCodeUseCase,
    DisableMfaUseCase,
    GetOrgMfaRequirementUseCase,
    UpsertOrgMfaRequirementUseCase,
    ResetUserMfaUseCase,
    CheckMfaLoginRequirementUseCase,
  ],
  exports: [
    SetupTotpUseCase,
    ConfirmTotpUseCase,
    VerifyMfaCodeUseCase,
    CheckMfaLoginRequirementUseCase,
  ],
})
export class MfaModule {}
