import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IpAllowlistRecord } from './infrastructure/persistence/postgres/schema/ip-allowlist.record';
import { IpAllowlistRepository } from './application/ports/ip-allowlist.repository';
import { PostgresIpAllowlistRepository } from './infrastructure/persistence/postgres/ip-allowlist.repository';

import { GetIpAllowlistUseCase } from './application/use-cases/get-ip-allowlist/get-ip-allowlist.use-case';
import { UpdateIpAllowlistUseCase } from './application/use-cases/update-ip-allowlist/update-ip-allowlist.use-case';
import { DeleteIpAllowlistUseCase } from './application/use-cases/delete-ip-allowlist/delete-ip-allowlist.use-case';

import { IpAllowlistGuard } from './application/guards/ip-allowlist.guard';
import { IpAllowlistController } from './presenters/http/ip-allowlist.controller';

@Module({
  imports: [TypeOrmModule.forFeature([IpAllowlistRecord])],
  controllers: [IpAllowlistController],
  providers: [
    {
      provide: IpAllowlistRepository,
      useClass: PostgresIpAllowlistRepository,
    },
    GetIpAllowlistUseCase,
    UpdateIpAllowlistUseCase,
    DeleteIpAllowlistUseCase,
    IpAllowlistGuard,
  ],
  exports: [
    GetIpAllowlistUseCase,
    UpdateIpAllowlistUseCase,
    DeleteIpAllowlistUseCase,
    IpAllowlistGuard,
  ],
})
export class IpAllowlistModule {}
