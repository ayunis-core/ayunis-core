import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Infrastructure
import { ShareRecord } from './infrastructure/postgres/schema/share.record';
import { ShareScopeRecord } from './infrastructure/postgres/schema/share-scope.record';
import { PostgresSharesRepository } from './infrastructure/postgres/postgres-shares.repository';
import { SharesRepository } from './application/ports/shares-repository.port';
import { ShareMapper } from './infrastructure/postgres/mappers/share.mapper';
import { ShareScopeMapper } from './infrastructure/postgres/mappers/share-scope.mapper';

// Use Cases
import { CreateShareUseCase } from './application/use-cases/create-share/create-share.use-case';
import { DeleteShareUseCase } from './application/use-cases/delete-share/delete-share.use-case';
import { GetSharesUseCase } from './application/use-cases/get-shares/get-shares.use-case';

// Factories
import { ShareAuthorizationFactory } from './application/factories/share-authorization.factory';

// DTOs and Mappers
import { ShareDtoMapper } from './presenters/http/mappers/share-dto.mapper';

// Presenters
import { SharesController } from './presenters/http/shares.controller';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShareRecord, ShareScopeRecord]),
    forwardRef(() => AgentsModule), // For AgentShareAuthorizationStrategy
  ],
  providers: [
    // Repository
    {
      provide: SharesRepository,
      useClass: PostgresSharesRepository,
    },

    // Mappers
    ShareMapper,
    ShareScopeMapper,

    // Use Cases
    CreateShareUseCase,
    DeleteShareUseCase,
    GetSharesUseCase,

    // Factories
    ShareAuthorizationFactory,

    // Mappers
    ShareDtoMapper,
  ],
  controllers: [SharesController],
  exports: [CreateShareUseCase, DeleteShareUseCase],
})
export class SharesModule {}
