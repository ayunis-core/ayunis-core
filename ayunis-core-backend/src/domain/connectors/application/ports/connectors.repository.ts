import type { UUID } from 'crypto';
import type { Connector } from 'src/domain/connectors/domain/connector.entity';

export abstract class ConnectorsRepository {
  abstract findAllByOrgId(orgId: UUID): Promise<Connector[]>;
}
