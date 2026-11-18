import {
  TEST_ORG_ID,
  createMockContextService,
} from 'src/common/context/testing/context.fixtures';
import { ConnectorCredentialsRequiredError } from 'src/domain/connectors/application/connectors.errors';
import type { ConnectorCredentialEncryptionPort } from 'src/domain/connectors/application/ports/connector-credential-encryption.port';
import type { ConnectorsRepository } from 'src/domain/connectors/application/ports/connectors.repository';
import type { Microsoft365ConnectionTestResult } from 'src/domain/connectors/application/models/microsoft-365-connection-test-result';
import type { Microsoft365ConnectionTestService } from 'src/domain/connectors/application/services/microsoft-365-connection-test.service';
import { Connector } from 'src/domain/connectors/domain/connector.entity';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import { ConnectorStatus } from 'src/domain/connectors/domain/connector-status.enum';
import { Microsoft365ConnectionTestOutcome } from 'src/domain/connectors/domain/microsoft-365/microsoft-365-connection-test-outcome.enum';
import { SaveMicrosoft365ConnectorCommand } from './save-microsoft-365-connector.command';
import { SaveMicrosoft365ConnectorUseCase } from './save-microsoft-365-connector.use-case';

const SETUP = {
  tenantId: '6f1c2c4e-3c1a-4f4e-9a59-2f1f0b8a7d11',
  clientId: '0b8a7d11-2f1f-4f4e-9a59-6f1c2c4e3c1a',
};
const SECRET = 'Zq8~kR2.client-secret-value';
const CONNECTION_TEST: Microsoft365ConnectionTestResult = {
  outcome: Microsoft365ConnectionTestOutcome.CONNECTED,
  permissions: [{ name: 'Sites.Selected', required: true, granted: true }],
  otherGrantedPermissions: [],
  entraErrorCode: null,
};

describe('SaveMicrosoft365ConnectorUseCase', () => {
  function setUp(setUpConnector: Connector | null) {
    const repository: jest.Mocked<ConnectorsRepository> = {
      findAllByOrgId: jest.fn(),
      findByOrgIdAndProduct: jest.fn(),
      upsert: jest.fn((connector: Connector) => Promise.resolve(connector)),
      updateSetupOfSetUp: jest.fn().mockResolvedValue(setUpConnector),
      clearSetupAndCredentials: jest.fn(),
    };
    const encryption: ConnectorCredentialEncryptionPort = {
      encrypt: (plaintext) =>
        Promise.resolve(`sealed:${Buffer.from(plaintext).toString('base64')}`),
      decrypt: jest.fn(),
    };
    const tested: Connector[] = [];
    const connectionTest = {
      test: (connector: Connector) => {
        tested.push(connector);
        return Promise.resolve(CONNECTION_TEST);
      },
    } as Microsoft365ConnectionTestService;
    const useCase = new SaveMicrosoft365ConnectorUseCase(
      repository,
      encryption,
      connectionTest,
      createMockContextService(),
    );
    return { repository, useCase, tested };
  }

  const setUpConnector = new Connector({
    orgId: TEST_ORG_ID,
    product: ConnectorProduct.MICROSOFT_365,
    setup: SETUP,
    encryptedCredentials: 'c2VhbGVk',
  });

  it('stores the client secret only encrypted, as one credentials value', async () => {
    const { repository, useCase } = setUp(null);

    const overview = await useCase.execute(
      new SaveMicrosoft365ConnectorCommand({ ...SETUP, clientSecret: SECRET }),
    );

    const saved = repository.upsert.mock.calls[0][0];
    expect(saved).toMatchObject({
      orgId: TEST_ORG_ID,
      product: ConnectorProduct.MICROSOFT_365,
      setup: SETUP,
    });
    expect(JSON.stringify(saved)).not.toContain(SECRET);
    expect(saved.encryptedCredentials).toBe(
      `sealed:${Buffer.from(JSON.stringify({ clientSecret: SECRET })).toString('base64')}`,
    );
    expect(overview).toEqual({
      status: ConnectorStatus.SET_UP,
      setup: SETUP,
      connectionTest: CONNECTION_TEST,
    });
  });

  it('changing the setup without a secret keeps the stored secret and tests the connection as saved', async () => {
    const { repository, useCase, tested } = setUp(setUpConnector);

    const overview = await useCase.execute(
      new SaveMicrosoft365ConnectorCommand(SETUP),
    );

    expect(repository.upsert).not.toHaveBeenCalled();
    expect(overview).toEqual({
      status: ConnectorStatus.SET_UP,
      setup: SETUP,
      connectionTest: CONNECTION_TEST,
    });
    expect(tested).toEqual([setUpConnector]);
  });

  it('refuses to set up a connection without a secret while none is stored', async () => {
    const { repository, useCase, tested } = setUp(null);

    await expect(
      useCase.execute(new SaveMicrosoft365ConnectorCommand(SETUP)),
    ).rejects.toThrow(ConnectorCredentialsRequiredError);
    expect(repository.upsert).not.toHaveBeenCalled();
    expect(tested).toEqual([]);
  });
});
