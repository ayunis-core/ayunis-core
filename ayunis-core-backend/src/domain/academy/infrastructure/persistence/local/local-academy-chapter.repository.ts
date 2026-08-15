import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { UUID } from 'crypto';

import { AcademyChapterRepository } from 'src/domain/academy/application/ports/academy-chapter.repository';
import { AcademyChapter } from 'src/domain/academy/domain/academy-chapter.entity';
import { AcademyChapterRecord } from './schema/academy-chapter.record';
import { AcademyMapper } from './mappers/academy.mapper';
import { ChapterNotFoundError } from 'src/domain/academy/application/academy.errors';

@Injectable()
export class LocalAcademyChapterRepository implements AcademyChapterRepository {
  constructor(
    @InjectPinoLogger(LocalAcademyChapterRepository.name)
    private readonly logger: PinoLogger,
    @InjectRepository(AcademyChapterRecord)
    private readonly repository: Repository<AcademyChapterRecord>,
    private readonly dataSource: DataSource,
    private readonly mapper: AcademyMapper,
  ) {}

  async findAllWithCourseModules(): Promise<AcademyChapter[]> {
    this.logger.info('findAllWithCourseModules');
    const records = await this.repository.find({
      relations: { courseModules: true },
      order: {
        position: 'ASC',
        createdAt: 'ASC',
        courseModules: { position: 'ASC', createdAt: 'ASC' },
      },
    });
    return records.map((record) => this.mapper.chapterToDomain(record));
  }

  async findAllWithQuizContent(): Promise<AcademyChapter[]> {
    this.logger.info('findAllWithQuizContent');
    const records = await this.repository.find({
      relations: { courseModules: true, quizQuestions: true },
      order: {
        position: 'ASC',
        createdAt: 'ASC',
        courseModules: { position: 'ASC', createdAt: 'ASC' },
        quizQuestions: { position: 'ASC', createdAt: 'ASC' },
      },
    });
    return records.map((record) => this.mapper.chapterToDomain(record));
  }

  async findOne(id: UUID): Promise<AcademyChapter | null> {
    this.logger.info({ id }, 'findOne');
    const record = await this.repository.findOne({
      where: { id },
      relations: { courseModules: true },
      order: { courseModules: { position: 'ASC', createdAt: 'ASC' } },
    });
    if (!record) return null;
    return this.mapper.chapterToDomain(record);
  }

  async findAllIds(): Promise<UUID[]> {
    this.logger.info('findAllIds');
    const records = await this.repository.find({ select: { id: true } });
    return records.map((record) => record.id);
  }

  async findQuizEnabledIds(): Promise<UUID[]> {
    this.logger.info('findQuizEnabledIds');
    const records = await this.repository.find({
      where: { quizEnabled: true },
      select: { id: true },
    });
    return records.map((record) => record.id);
  }

  async findMaxPosition(): Promise<number | null> {
    this.logger.info('findMaxPosition');
    return this.repository.maximum('position');
  }

  async create(chapter: AcademyChapter): Promise<AcademyChapter> {
    this.logger.info({ title: chapter.title }, 'create');
    const record = this.mapper.chapterToRecord(chapter);
    const saved = await this.repository.save(record);
    return this.mapper.chapterToDomain(saved);
  }

  async update(chapter: AcademyChapter): Promise<AcademyChapter> {
    this.logger.info({ id: chapter.id }, 'update');
    const record = this.mapper.chapterToRecord(chapter);
    const saved = await this.repository.save(record);
    return this.mapper.chapterToDomain(saved);
  }

  async delete(id: UUID): Promise<void> {
    this.logger.info({ id }, 'delete');
    const result = await this.repository.delete({ id });
    if (result.affected === 0) {
      throw new ChapterNotFoundError(id);
    }
  }

  async updatePositions(orderedIds: UUID[]): Promise<void> {
    this.logger.info({ count: orderedIds.length }, 'updatePositions');
    await this.dataSource.transaction(async (manager) => {
      for (const [index, id] of orderedIds.entries()) {
        await manager.update(AcademyChapterRecord, { id }, { position: index });
      }
    });
  }
}
