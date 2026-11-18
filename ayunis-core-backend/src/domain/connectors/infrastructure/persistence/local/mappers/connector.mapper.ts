import { Injectable } from '@nestjs/common';
import { Connector } from 'src/domain/connectors/domain/connector.entity';
import type { ConnectorRecord } from 'src/domain/connectors/infrastructure/persistence/local/schema/connector.record';

@Injectable()
export class ConnectorMapper {
  toDomain(record: ConnectorRecord): Connector {
    return new Connector({
      id: record.id,
      orgId: record.orgId,
      product: record.product,
      setup: record.setup,
      encryptedCredentials: record.encryptedCredentials,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
