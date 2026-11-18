import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import { Repository } from 'typeorm';
import { ConnectorsRepository } from 'src/domain/connectors/application/ports/connectors.repository';
import type {
  Connector,
  ConnectorSetup,
} from 'src/domain/connectors/domain/connector.entity';
import type { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import { ConnectorRecord } from './schema/connector.record';
import { ConnectorMapper, type ConnectorRow } from './mappers/connector.mapper';

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

  async findById(id: UUID): Promise<Connector | null> {
    const record = await this.repository.findOne({ where: { id } });
    return record ? this.mapper.toDomain(record) : null;
  }

  async findByOrgIdAndProduct(
    orgId: UUID,
    product: ConnectorProduct,
  ): Promise<Connector | null> {
    const record = await this.repository.findOne({
      where: { orgId, product },
    });
    return record ? this.mapper.toDomain(record) : null;
  }

  /** One statement, so concurrent first setups cannot collide. */
  async upsert(connector: Connector): Promise<Connector> {
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .values(this.mapper.toInsertRow(connector))
      .orUpdate(
        ['setup', 'encryptedCredentials', 'updatedAt'],
        ['orgId', 'product'],
      )
      .returning('*')
      .execute();
    const [row] = result.raw as ConnectorRow[];
    return this.mapper.toDomain(row);
  }

  /**
   * Conditional on the credentials in the same statement, so a concurrent
   * removal cannot leave a setup behind without credentials.
   */
  async updateSetupOfSetUp(
    orgId: UUID,
    product: ConnectorProduct,
    setup: ConnectorSetup,
  ): Promise<Connector | null> {
    const result = await this.repository
      .createQueryBuilder()
      .update()
      .set({ setup })
      .where({ orgId, product })
      .andWhere('"encryptedCredentials" IS NOT NULL')
      .returning('*')
      .execute();
    const row = (result.raw as ConnectorRow[]).at(0);
    return row ? this.mapper.toDomain(row) : null;
  }

  async clearSetupAndCredentials(
    orgId: UUID,
    product: ConnectorProduct,
  ): Promise<void> {
    await this.repository.update(
      { orgId, product },
      { setup: {}, encryptedCredentials: null },
    );
  }
}
