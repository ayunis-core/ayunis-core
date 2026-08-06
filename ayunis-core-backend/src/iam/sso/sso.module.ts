import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FederatedIdentityRecord } from './infrastructure/persistence/postgres/schema/federated-identity.record';
import { OrgSsoConnectionRecord } from './infrastructure/persistence/postgres/schema/org-sso-connection.record';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrgSsoConnectionRecord, FederatedIdentityRecord]),
  ],
})
export class SsoModule {}
