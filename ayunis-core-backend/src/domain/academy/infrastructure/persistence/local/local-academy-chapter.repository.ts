import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { UUID } from 'crypto';

import { AcademyChapterRepository } from '../../../application/ports/academy-chapter.repository';
import { AcademyChapter } from '../../../domain/academy-chapter.entity';
import { AcademyChapterRecord } from './schema/academy-chapter.record';
import { AcademyMapper } from './mappers/academy.mapper';
import { ChapterNotFoundError } from '../../../application/academy.errors';

@Injectable()
export class LocalAcademyChapterRepository implements AcademyChapterRepository {
  private readonly logger = new Logger(LocalAcademyChapterRepository.name);

  constructor(
    @InjectRepository(AcademyChapterRecord)
    private readonly repository: Repository<AcademyChapterRecord>,
    private readonly dataSource: DataSource,
    private readonly mapper: AcademyMapper,
  ) {}

  async findAllWithCourseModules(): Promise<AcademyChapter[]> {
    this.logger.log('findAllWithCourseModules');
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
    this.logger.log('findAllWithQuizContent');
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
    this.logger.log('findOne', { id });
    const record = await this.repository.findOne({
      where: { id },
      relations: { courseModules: true },
      order: { courseModules: { position: 'ASC', createdAt: 'ASC' } },
    });
    if (!record) return null;
    return this.mapper.chapterToDomain(record);
  }

  async findAllIds(): Promise<UUID[]> {
    this.logger.log('findAllIds');
    const records = await this.repository.find({ select: { id: true } });
    return records.map((record) => record.id);
  }

  async findMaxPosition(): Promise<number | null> {
    this.logger.log('findMaxPosition');
    return this.repository.maximum('position');
  }

  async create(chapter: AcademyChapter): Promise<AcademyChapter> {
    this.logger.log('create', { title: chapter.title });
    const record = this.mapper.chapterToRecord(chapter);
    const saved = await this.repository.save(record);
    return this.mapper.chapterToDomain(saved);
  }

  async update(chapter: AcademyChapter): Promise<AcademyChapter> {
    this.logger.log('update', { id: chapter.id });
    const record = this.mapper.chapterToRecord(chapter);
    const saved = await this.repository.save(record);
    return this.mapper.chapterToDomain(saved);
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log('delete', { id });
    const result = await this.repository.delete({ id });
    if (result.affected === 0) {
      throw new ChapterNotFoundError(id);
    }
  }

  async updatePositions(orderedIds: UUID[]): Promise<void> {
    this.logger.log('updatePositions', { count: orderedIds.length });
    await this.dataSource.transaction(async (manager) => {
      for (const [index, id] of orderedIds.entries()) {
        await manager.update(AcademyChapterRecord, { id }, { position: index });
      }
    });
  }
}
