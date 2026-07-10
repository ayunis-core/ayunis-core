import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HashingModule } from '../hashing/hashing.module';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserTotpRecord,
      MfaRecoveryCodeRecord,
      OrgMfaRequirementRecord,
    ]),
    HashingModule,
  ],
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
  ],
  exports: [],
})
export class MfaModule {}
