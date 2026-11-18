import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConnectorsRepository } from 'src/domain/connectors/application/ports/connectors.repository';
import { ConnectorRecord } from './schema/connector.record';
import { ConnectorMapper } from './mappers/connector.mapper';
import { LocalConnectorsRepository } from './local-connectors.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ConnectorRecord])],
  providers: [
    ConnectorMapper,
    {
      provide: ConnectorsRepository,
      useClass: LocalConnectorsRepository,
    },
  ],
  exports: [ConnectorsRepository],
})
export class LocalConnectorsRepositoryModule {}
