import type { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import type { ConnectorSyncAdapter } from './ports/connector-sync-adapter.port';

/** Provided through a factory with every product's adapter. */
export class ConnectorSyncAdapterRegistry {
  private readonly adapters = new Map<ConnectorProduct, ConnectorSyncAdapter>();

  constructor(adapters: ConnectorSyncAdapter[] = []) {
    for (const adapter of adapters) this.adapters.set(adapter.product, adapter);
  }

  find(product: ConnectorProduct): ConnectorSyncAdapter | undefined {
    return this.adapters.get(product);
  }
}
