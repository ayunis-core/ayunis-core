import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { chunk } from 'src/common/util/chunk';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { SourceUploadStorageCleanupService } from 'src/domain/sources/application/services/source-upload-storage-cleanup.service';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { ListObjectSummariesCommand } from 'src/domain/storage/application/use-cases/list-object-summaries/list-object-summaries.command';
import { ListObjectSummariesUseCase } from 'src/domain/storage/application/use-cases/list-object-summaries/list-object-summaries.use-case';

const UPLOAD_KEY_SEGMENT = '/uploads/';
/**
 * Upload sessions are purged seven days after they finish, so an object this
 * old that no source references cannot belong to a live transfer either.
 */
export const UNREFERENCED_ORIGINAL_MIN_AGE_MS = 8 * 24 * 60 * 60 * 1000;
const LOOKUP_CHUNK_SIZE = 200;

export interface SweepUnreferencedOriginalsResult {
  candidateCount: number;
  deletedCount: number;
  failedCount: number;
}

/**
 * Releasing a retained original happens after its source row is gone, so a
 * failed delete there has nothing left to retry it, and a delete that ran
 * inside a caller's transaction leaves the release to this sweep. It lists
 * every object under the upload prefix, skips the ones a source still points
 * at, and removes the rest once they are old enough to belong to no session.
 */
@Injectable()
export class SweepUnreferencedOriginalsUseCase {
  private readonly logger = new Logger(SweepUnreferencedOriginalsUseCase.name);

  constructor(
    private readonly listObjectSummaries: ListObjectSummariesUseCase,
    private readonly sourceRepository: SourceRepository,
    private readonly storageCleanup: SourceUploadStorageCleanupService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(
    now: Date = new Date(),
  ): Promise<SweepUnreferencedOriginalsResult> {
    this.logger.log('Sweeping unreferenced upload originals');
    const cutoff = now.getTime() - UNREFERENCED_ORIGINAL_MIN_AGE_MS;
    const summaries = await this.listObjectSummaries.execute(
      new ListObjectSummariesCommand(''),
    );
    const candidates = summaries
      .filter(
        (object) =>
          object.objectName.includes(UPLOAD_KEY_SEGMENT) &&
          object.lastModified !== undefined &&
          object.lastModified.getTime() < cutoff,
      )
      .map((object) => object.objectName);

    const result: SweepUnreferencedOriginalsResult = {
      candidateCount: candidates.length,
      deletedCount: 0,
      failedCount: 0,
    };
    for (const keys of chunk(candidates, LOOKUP_CHUNK_SIZE)) {
      const referenced = new Set(
        await this.sourceRepository.findReferencedStorageKeys(keys),
      );
      for (const key of keys) {
        if (referenced.has(key)) continue;
        if (await this.storageCleanup.remove(key)) result.deletedCount += 1;
        else result.failedCount += 1;
      }
    }
    this.logger.log({ ...result }, 'Swept unreferenced upload originals');
    return result;
  }
}
