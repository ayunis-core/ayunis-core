import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { Repository } from 'typeorm';

import { ApiKeysRepository } from './application/ports/api-keys.repository';
import { LocalApiKeysRepository } from './infrastructure/repositories/local/local-api-keys.repository';
import { ApiKeyRecord } from './infrastructure/repositories/local/schema/api-key.record';

import { CreateApiKeyUseCase } from './application/use-cases/create-api-key/create-api-key.use-case';
import { ListApiKeysByOrgUseCase } from './application/use-cases/list-api-keys-by-org/list-api-keys-by-org.use-case';
import { RevokeApiKeyUseCase } from './application/use-cases/revoke-api-key/revoke-api-key.use-case';
import { ValidateApiKeyUseCase } from './application/use-cases/validate-api-key/validate-api-key.use-case';

import { ApiKeysController } from './presenters/http/api-keys.controller';
import { ApiKeyDtoMapper } from './presenters/http/mappers/api-key-dto.mapper';
import { ApiKeyStrategy } from './application/strategies/api-key.strategy';

import { HashingModule } from '../hashing/hashing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiKeyRecord]),
    HashingModule,
    PassportModule,
  ],
  controllers: [ApiKeysController],
  providers: [
    {
      provide: ApiKeysRepository,
      useFactory: (apiKeyRepository: Repository<ApiKeyRecord>) => {
        return new LocalApiKeysRepository(apiKeyRepository);
      },
      inject: [getRepositoryToken(ApiKeyRecord)],
    },
    CreateApiKeyUseCase,
    ListApiKeysByOrgUseCase,
    RevokeApiKeyUseCase,
    ValidateApiKeyUseCase,
    ApiKeyDtoMapper,
    ApiKeyStrategy,
  ],
  exports: [
    CreateApiKeyUseCase,
    ListApiKeysByOrgUseCase,
    RevokeApiKeyUseCase,
    ValidateApiKeyUseCase,
  ],
})
export class ApiKeysModule {}
