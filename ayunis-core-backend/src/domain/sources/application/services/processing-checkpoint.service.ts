import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { DownloadObjectCommand } from 'src/domain/storage/application/use-cases/download-object/download-object.command';
import { UploadOrgObjectUseCase } from 'src/domain/storage/application/use-cases/upload-org-object/upload-org-object.use-case';
import { UploadOrgObjectCommand } from 'src/domain/storage/application/use-cases/upload-org-object/upload-org-object.command';
import { PurgeStoragePrefixesUseCase } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';
import { PurgeStoragePrefixesCommand } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.command';
import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';
import {
  assertProcessingActive,
  ProcessingStoppedError,
  type ProcessingContext,
} from 'src/common/types/processing-context';

const MAX_CHECKPOINT_BYTES = 16 * 1024 * 1024;

@Injectable()
export class ProcessingCheckpointService {
  constructor(
    private readonly sources: SourceRepository,
    private readonly download: DownloadObjectUseCase,
    private readonly upload: UploadOrgObjectUseCase,
    private readonly purge: PurgeStoragePrefixesUseCase,
  ) {}

  create(
    orgId: UUID,
    sourceId: UUID,
    progress: (completed: number) => Promise<void> = () => Promise.resolve(),
  ): ProcessingContext {
    const context: ProcessingContext = {
      isActive: async () => {
        const source = await this.sources.findById(sourceId);
        return (
          source?.status === SourceStatus.PROCESSING &&
          (!source.storageKey || source.storageKey.startsWith(`${orgId}/`))
        );
      },
      read: async (key) => {
        await assertProcessingActive(context);
        return this.read(this.key(orgId, sourceId, key));
      },
      write: async (key, value) => {
        await assertProcessingActive(context);
        await this.write(orgId, this.key(orgId, sourceId, key), value, context);
      },
      progress,
    };
    return context;
  }

  async cleanup(orgId: UUID, sourceId: UUID): Promise<void> {
    await this.purge.execute(
      new PurgeStoragePrefixesCommand([
        `${orgId}/processing/${sourceId}/results/`,
      ]),
    );
  }

  private key(orgId: UUID, sourceId: UUID, key: string): string {
    if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('Invalid checkpoint key');
    return `${orgId}/processing/${sourceId}/results/${key}.json`;
  }

  private async read(key: string): Promise<string | undefined> {
    try {
      const stream = await this.download.execute(
        new DownloadObjectCommand(key),
      );
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of stream) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > MAX_CHECKPOINT_BYTES)
          throw new Error('Checkpoint exceeds size limit');
        chunks.push(buffer);
      }
      return Buffer.concat(chunks).toString('utf8');
    } catch (error) {
      if (error instanceof ObjectNotFoundError) return undefined;
      throw error;
    }
  }

  private async write(
    orgId: UUID,
    key: string,
    value: string,
    context: ProcessingContext,
  ): Promise<void> {
    const buffer = Buffer.from(value);
    if (buffer.length > MAX_CHECKPOINT_BYTES)
      throw new Error('Checkpoint exceeds size limit');
    await this.upload.execute(new UploadOrgObjectCommand(orgId, key, buffer));
    if (!(await context.isActive())) {
      await this.purge.execute(new PurgeStoragePrefixesCommand([key]));
      throw new ProcessingStoppedError();
    }
  }
}
