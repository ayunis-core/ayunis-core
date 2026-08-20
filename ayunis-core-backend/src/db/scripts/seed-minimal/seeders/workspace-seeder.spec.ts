import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import type { TextSourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import type { SeedDocumentFixture } from 'src/db/scripts/seed-minimal/seed-types';
import { WorkspaceSeeder } from './workspace-seeder';

describe('WorkspaceSeeder', () => {
  it('restores failed seed documents to ready', async () => {
    const source = {
      name: 'Old name',
      status: SourceStatus.FAILED,
      processingError: null,
    } as TextSourceRecord;
    const document = {
      name: 'Demo document',
      text: 'Demo text',
    };
    const save = jest.fn().mockResolvedValue(source);
    const seeder = new WorkspaceSeeder();
    (
      seeder as unknown as {
        repo: jest.Mock;
      }
    ).repo = jest.fn().mockReturnValue({ save });

    await (
      seeder as unknown as {
        refreshSeedDocument: (
          source: TextSourceRecord,
          document: SeedDocumentFixture,
        ) => Promise<void>;
      }
    ).refreshSeedDocument(source, document);

    expect(source).toMatchObject({
      name: 'Demo document',
      status: SourceStatus.READY,
      processingError: null,
    });
    expect(save).toHaveBeenCalledWith(source);
  });
});
