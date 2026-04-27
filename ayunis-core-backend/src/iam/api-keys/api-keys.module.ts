import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApiKeysRepository } from './application/ports/api-keys.repository';
import { LocalApiKeysRepository } from './infrastructure/repositories/local/local-api-keys.repository';
import { ApiKeyRecord } from './infrastructure/repositories/local/schema/api-key.record';

import { CreateApiKeyUseCase } from './application/use-cases/create-api-key/create-api-key.use-case';
import { ListApiKeysByOrgUseCase } from './application/use-cases/list-api-keys-by-org/list-api-keys-by-org.use-case';
import { RevokeApiKeyUseCase } from './application/use-cases/revoke-api-key/revoke-api-key.use-case';

import { ApiKeysController } from './presenters/http/api-keys.controller';
import { ApiKeyDtoMapper } from './presenters/http/mappers/api-key-dto.mapper';

import { HashingModule } from '../hashing/hashing.module';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKeyRecord]), HashingModule],
  controllers: [ApiKeysController],
  providers: [
    {
      provide: ApiKeysRepository,
      useClass: LocalApiKeysRepository,
    },
    CreateApiKeyUseCase,
    ListApiKeysByOrgUseCase,
    RevokeApiKeyUseCase,
    ApiKeyDtoMapper,
  ],
  exports: [CreateApiKeyUseCase, ListApiKeysByOrgUseCase, RevokeApiKeyUseCase],
})
export class ApiKeysModule {}
