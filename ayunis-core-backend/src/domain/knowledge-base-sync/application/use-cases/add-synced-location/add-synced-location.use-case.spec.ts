import { ConnectorNotSetUpError } from 'src/domain/connectors/application/connectors.errors';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import {
  KnowledgeBaseSyncDisabledError,
  SyncedLocationAlreadyExistsError,
} from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import {
  CONNECTOR_ID,
  featureConfig,
  InMemorySyncedLocationsRepository,
  KNOWLEDGE_BASE_ID,
  ORG_ID,
} from 'src/domain/knowledge-base-sync/application/testing/knowledge-base-sync.fixtures';
import { AddSyncedLocationCommand } from './add-synced-location.command';
import { AddSyncedLocationUseCase } from './add-synced-location.use-case';

describe('AddSyncedLocationUseCase', () => {
  const command = new AddSyncedLocationCommand({
    knowledgeBaseId: KNOWLEDGE_BASE_ID,
    product: ConnectorProduct.MICROSOFT_365,
    location: ' https://municipality.sharepoint.com/sites/bauamt ',
  });

  function adding(
    options: {
      writable?: boolean;
      setUp?: boolean;
      connectorsEnabled?: boolean;
    } = {},
  ) {
    const repository = new InMemorySyncedLocationsRepository();
    const useCase = new AddSyncedLocationUseCase(
      repository,
      {
        execute: () =>
          options.writable === false
            ? Promise.reject(new KnowledgeBaseNotFoundError(KNOWLEDGE_BASE_ID))
            : Promise.resolve({ id: KNOWLEDGE_BASE_ID, orgId: ORG_ID }),
      } as never,
      {
        execute: () =>
          options.setUp === false
            ? Promise.reject(
                new ConnectorNotSetUpError(ConnectorProduct.MICROSOFT_365),
              )
            : Promise.resolve({ id: CONNECTOR_ID }),
      } as never,
      featureConfig(options.connectorsEnabled ?? true),
    );
    return { repository, useCase };
  }

  it("adds the location through the organization's connector, once", async () => {
    const { repository, useCase } = adding();

    const location = await useCase.execute(command);

    expect(location).toMatchObject({
      orgId: ORG_ID,
      knowledgeBaseId: KNOWLEDGE_BASE_ID,
      connectorId: CONNECTOR_ID,
      location: 'https://municipality.sharepoint.com/sites/bauamt',
      cursor: null,
    });
    await expect(useCase.execute(command)).rejects.toThrow(
      SyncedLocationAlreadyExistsError,
    );
    expect(repository.locations.size).toBe(1);
  });

  it.each([
    [
      'a user who may not change the knowledge base',
      { writable: false },
      KnowledgeBaseNotFoundError,
    ],
    [
      'an organization without the connector set up',
      { setUp: false },
      ConnectorNotSetUpError,
    ],
    [
      'connectors switched off',
      { connectorsEnabled: false },
      KnowledgeBaseSyncDisabledError,
    ],
  ])('adds nothing for %s', async (_case, options, error) => {
    const { repository, useCase } = adding(options);

    await expect(useCase.execute(command)).rejects.toThrow(error);
    expect(repository.locations.size).toBe(0);
  });
});
