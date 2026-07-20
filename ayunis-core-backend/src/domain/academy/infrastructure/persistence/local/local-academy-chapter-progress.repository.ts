import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';

import { AcademyChapterProgressRepository } from 'src/domain/academy/application/ports/academy-chapter-progress.repository';
import { AcademyChapterProgress } from 'src/domain/academy/domain/academy-chapter-progress.entity';
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
    const saved = await this.repository.save(record);
    return this.mapper.chapterProgressToDomain(saved);
  }
}
