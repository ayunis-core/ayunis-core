import type { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import type { ConnectorSyncAdapter } from './ports/connector-sync-adapter.port';

/**
 * One adapter per product. Each provider module registers its own while the
 * application is created, before anything syncs.
 */
export class ConnectorSyncAdapterRegistry {
  private readonly adapters = new Map<ConnectorProduct, ConnectorSyncAdapter>();

  constructor(adapters: ConnectorSyncAdapter[] = []) {
    for (const adapter of adapters) this.register(adapter);
  }

  register(adapter: ConnectorSyncAdapter): void {
    this.adapters.set(adapter.product, adapter);
  }

  find(product: ConnectorProduct): ConnectorSyncAdapter | undefined {
    return this.adapters.get(product);
  }
}
