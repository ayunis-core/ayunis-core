import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import { Repository } from 'typeorm';
import { ConnectorsRepository } from 'src/domain/connectors/application/ports/connectors.repository';
import type { Connector } from 'src/domain/connectors/domain/connector.entity';
import { ConnectorRecord } from './schema/connector.record';
import { ConnectorMapper } from './mappers/connector.mapper';

@Injectable()
export class LocalConnectorsRepository extends ConnectorsRepository {
  constructor(
    @InjectRepository(ConnectorRecord)
    private readonly repository: Repository<ConnectorRecord>,
    private readonly mapper: ConnectorMapper,
  ) {
    super();
  }

  async findAllByOrgId(orgId: UUID): Promise<Connector[]> {
    const records = await this.repository.find({ where: { orgId } });
    return records.map((record) => this.mapper.toDomain(record));
  }
}
