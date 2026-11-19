import {
  TEST_ORG_ID,
  createMockContextService,
} from 'src/common/context/testing/context.fixtures';
import type { ConnectorsRepository } from 'src/domain/connectors/application/ports/connectors.repository';
import { Connector } from 'src/domain/connectors/domain/connector.entity';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import { ConnectorStatus } from 'src/domain/connectors/domain/connector-status.enum';
import { ListConnectorsUseCase } from './list-connectors.use-case';

describe('ListConnectorsUseCase', () => {
  function listWith(connectors: Connector[]) {
    const repository: ConnectorsRepository = {
      findAllByOrgId: jest.fn().mockResolvedValue(connectors),
    };
    return new ListConnectorsUseCase(
      repository,
      createMockContextService(),
    ).execute();
  }

  const microsoft365 = (encryptedCredentials: string | null) =>
    new Connector({
      orgId: TEST_ORG_ID,
      product: ConnectorProduct.MICROSOFT_365,
      setup: { tenantId: '6f1c2c4e-3c1a-4f4e-9a59-2f1f0b8a7d11' },
      encryptedCredentials,
    });

  it('lists every available product as not set up while the organization has no connector', async () => {
    await expect(listWith([])).resolves.toEqual([
      {
        product: ConnectorProduct.MICROSOFT_365,
        status: ConnectorStatus.NOT_SET_UP,
      },
    ]);
  });

  it('shows a connector as set up only while it has credentials', async () => {
    await expect(listWith([microsoft365('c2VhbGVk')])).resolves.toEqual([
      {
        product: ConnectorProduct.MICROSOFT_365,
        status: ConnectorStatus.SET_UP,
      },
    ]);
    await expect(listWith([microsoft365(null)])).resolves.toEqual([
      {
        product: ConnectorProduct.MICROSOFT_365,
        status: ConnectorStatus.NOT_SET_UP,
      },
    ]);
  });
});
