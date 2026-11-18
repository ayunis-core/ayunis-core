import { Injectable } from '@nestjs/common';
import { Connector } from 'src/domain/connectors/domain/connector.entity';
import type { ConnectorRecord } from 'src/domain/connectors/infrastructure/persistence/local/schema/connector.record';

/** A connector row without its relations, e.g. as returned by `RETURNING *`. */
export type ConnectorRow = Omit<ConnectorRecord, 'org'>;

@Injectable()
export class ConnectorMapper {
  toDomain(record: ConnectorRow): Connector {
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

  /** Without timestamps: the database clock sets them, as on every update. */
  toInsertRow(
    connector: Connector,
  ): Omit<ConnectorRow, 'createdAt' | 'updatedAt'> {
    return {
      id: connector.id,
      orgId: connector.orgId,
      product: connector.product,
      setup: connector.setup,
      encryptedCredentials: connector.encryptedCredentials,
    };
  }
}
