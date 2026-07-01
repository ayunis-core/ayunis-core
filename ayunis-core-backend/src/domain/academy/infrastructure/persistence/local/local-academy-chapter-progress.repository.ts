import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';

import { AcademyChapterProgressRepository } from '../../../application/ports/academy-chapter-progress.repository';
import { AcademyChapterProgress } from '../../../domain/academy-chapter-progress.entity';
import { AcademyChapterProgressRecord } from './schema/academy-chapter-progress.record';
import { AcademyMapper } from './mappers/academy.mapper';

@Injectable()
export class LocalAcademyChapterProgressRepository implements AcademyChapterProgressRepository {
  private readonly logger = new Logger(
    LocalAcademyChapterProgressRepository.name,
  );

  constructor(
    @InjectRepository(AcademyChapterProgressRecord)
    private readonly repository: Repository<AcademyChapterProgressRecord>,
    private readonly mapper: AcademyMapper,
  ) {}

  async findByUserAndChapter(
    userId: UUID,
    chapterId: UUID,
  ): Promise<AcademyChapterProgress | null> {
    this.logger.log('findByUserAndChapter', { userId, chapterId });
    const record = await this.repository.findOne({
      where: { userId, chapterId },
    });
    if (!record) return null;
    return this.mapper.chapterProgressToDomain(record);
  }

  async findAllByUser(userId: UUID): Promise<AcademyChapterProgress[]> {
    this.logger.log('findAllByUser', { userId });
    const records = await this.repository.find({ where: { userId } });
    return records.map((record) => this.mapper.chapterProgressToDomain(record));
  }

  async upsert(
    progress: AcademyChapterProgress,
  ): Promise<AcademyChapterProgress> {
    this.logger.log('upsert', {
      userId: progress.userId,
      chapterId: progress.chapterId,
    });
    const record = this.mapper.chapterProgressToRecord(progress);

    // Use atomic upsert with conflict resolution on (userId, chapterId)
    await this.repository.upsert(record, {
      conflictPaths: ['userId', 'chapterId'],
      skipUpdateIfNoValuesChanged: true,
    });

    // Fetch the saved record to get the actual id (may be existing or new)
    const savedRecord = await this.repository.findOneOrFail({
      where: { userId: progress.userId, chapterId: progress.chapterId },
    });

    return this.mapper.chapterProgressToDomain(savedRecord);
  }
}
