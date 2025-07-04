import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermittedProviderRecord } from './schema/permitted-provider.record';
import { PermittedProviderMapper } from './mappers/permitted-provider.mapper';
import { LocalPermittedProvidersRepository } from './local-permitted-providers.repository';
import { PermittedProvidersRepository } from '../../../application/ports/permitted-providers.repository';

@Module({
  imports: [TypeOrmModule.forFeature([PermittedProviderRecord])],
  providers: [
    LocalPermittedProvidersRepository,
    PermittedProviderMapper,
    {
      provide: PermittedProvidersRepository,
      useClass: LocalPermittedProvidersRepository,
    },
  ],
  exports: [
    LocalPermittedProvidersRepository,
    PermittedProviderMapper,
    PermittedProvidersRepository,
  ],
})
export class LocalPermittedProvidersRepositoryModule {}
