import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CrawlDomainAccessDeniedError } from 'src/domain/crawl-domain-grants/application/crawl-domain-grants.errors';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import {
  InvalidSyncedLocationError,
  SyncedLocationAlreadyExistsError,
} from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import type { SyncRunRequest } from 'src/domain/knowledge-base-sync/application/ports/sync-runs.port';
import { SyncedLocationRegistrar } from 'src/domain/knowledge-base-sync/application/services/synced-location-registrar.service';
import {
  InMemorySyncedLocationsRepository,
  KNOWLEDGE_BASE_ID,
  ORG_ID,
} from 'src/domain/knowledge-base-sync/application/testing/knowledge-base-sync.fixtures';
import { SyncedLocationProvider } from 'src/domain/knowledge-base-sync/domain/synced-location-provider.enum';
import { AddWebSyncedLocationCommand } from './add-web-synced-location.command';
import { AddWebSyncedLocationUseCase } from './add-web-synced-location.use-case';

describe('AddWebSyncedLocationUseCase', () => {
  const command = (url: string, depth = 1) =>
    new AddWebSyncedLocationCommand({
      knowledgeBaseId: KNOWLEDGE_BASE_ID,
      url,
      depth,
    });

  function adding(
    options: { writeDenial?: Error; crawlDenied?: boolean } = {},
  ) {
    const repository = new InMemorySyncedLocationsRepository();
    const queued: SyncRunRequest[] = [];
    const useCase = new AddWebSyncedLocationUseCase(
      {
        execute: () =>
          options.writeDenial
            ? Promise.reject(options.writeDenial)
            : Promise.resolve({ id: KNOWLEDGE_BASE_ID, orgId: ORG_ID }),
      } as never,
      {
        execute: () =>
          options.crawlDenied
            ? Promise.reject(new CrawlDomainAccessDeniedError())
            : Promise.resolve(),
      } as never,
      new SyncedLocationRegistrar(repository, {
        enqueue: (runs: SyncRunRequest[]) => {
          queued.push(...runs);
          return Promise.resolve();
        },
      } as never),
    );
    return { repository, useCase, queued };
  }

  it('adds the website once, at the URL the crawler requests, and queues its first sync', async () => {
    const { repository, useCase, queued } = adding();

    const location = await useCase.execute(
      command(' https://www.Musterstadt.de#start '),
    );

    expect(location).toMatchObject({
      provider: SyncedLocationProvider.WEB,
      orgId: ORG_ID,
      knowledgeBaseId: KNOWLEDGE_BASE_ID,
      location: 'https://www.musterstadt.de/',
      depth: 1,
    });
    await expect(
      useCase.execute(command('https://www.musterstadt.de/', 2)),
    ).rejects.toThrow(SyncedLocationAlreadyExistsError);
    expect(repository.locations.size).toBe(1);
    expect(queued).toEqual([{ orgId: ORG_ID, locationId: location.id }]);
  });

  it.each([
    [
      'a reader of the knowledge base',
      { writeDenial: new UnauthorizedAccessError() },
      UnauthorizedAccessError,
    ],
    [
      'a user of another organization',
      { writeDenial: new KnowledgeBaseNotFoundError(KNOWLEDGE_BASE_ID) },
      KnowledgeBaseNotFoundError,
    ],
    [
      "a host granted to another organization's crawls",
      { crawlDenied: true },
      CrawlDomainAccessDeniedError,
    ],
  ])('adds nothing for %s', async (_case, options, error) => {
    const { repository, useCase, queued } = adding(options);

    await expect(
      useCase.execute(command('https://intranet.musterstadt.de/')),
    ).rejects.toThrow(error);
    expect(repository.locations.size).toBe(0);
    expect(queued).toEqual([]);
  });

  it.each([
    ['a URL without http(s)', command('file:///etc/hosts')],
    ['a host without a top-level domain', command('https://intranet/')],
    ['no URL', command('Musterstadt')],
    ['a depth beyond 2', command('https://www.musterstadt.de/', 3)],
    ['a negative depth', command('https://www.musterstadt.de/', -1)],
  ])('refuses %s', async (_case, invalid) => {
    const { repository, useCase } = adding();

    await expect(useCase.execute(invalid)).rejects.toThrow(
      InvalidSyncedLocationError,
    );
    expect(repository.locations.size).toBe(0);
  });
});
