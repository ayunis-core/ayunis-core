import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { UUID } from 'crypto';

import { AcademyLessonRepository } from '../../../application/ports/academy-lesson.repository';
import { AcademyLesson } from '../../../domain/academy-lesson.entity';
import { AcademyLessonRecord } from './schema/academy-lesson.record';
import { AcademyMapper } from './mappers/academy.mapper';
import { LessonNotFoundError } from '../../../application/academy.errors';

@Injectable()
export class LocalAcademyLessonRepository implements AcademyLessonRepository {
  private readonly logger = new Logger(LocalAcademyLessonRepository.name);

  constructor(
    @InjectRepository(AcademyLessonRecord)
    private readonly repository: Repository<AcademyLessonRecord>,
    private readonly dataSource: DataSource,
    private readonly mapper: AcademyMapper,
  ) {}

  async findOne(id: UUID): Promise<AcademyLesson | null> {
    this.logger.log('findOne', { id });
    const record = await this.repository.findOne({ where: { id } });
    if (!record) return null;
    return this.mapper.lessonToDomain(record);
  }

  async findIdsByChapterId(chapterId: UUID): Promise<UUID[]> {
    this.logger.log('findIdsByChapterId', { chapterId });
    const records = await this.repository.find({
      select: { id: true },
      where: { chapterId },
    });
    return records.map((record) => record.id);
  }

  async findMaxPosition(chapterId: UUID): Promise<number | null> {
    this.logger.log('findMaxPosition', { chapterId });
    return this.repository.maximum('position', { chapterId });
  }

  async create(lesson: AcademyLesson): Promise<AcademyLesson> {
    this.logger.log('create', { title: lesson.title });
    const record = this.mapper.lessonToRecord(lesson);
    const saved = await this.repository.save(record);
    return this.mapper.lessonToDomain(saved);
  }

  async update(lesson: AcademyLesson): Promise<AcademyLesson> {
    this.logger.log('update', { id: lesson.id });
    const record = this.mapper.lessonToRecord(lesson);
    const saved = await this.repository.save(record);
    return this.mapper.lessonToDomain(saved);
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log('delete', { id });
    const result = await this.repository.delete({ id });
    if (result.affected === 0) {
      throw new LessonNotFoundError(id);
    }
  }

  async updatePositions(chapterId: UUID, orderedIds: UUID[]): Promise<void> {
    this.logger.log('updatePositions', {
      chapterId,
      count: orderedIds.length,
    });
    await this.dataSource.transaction(async (manager) => {
      for (const [index, id] of orderedIds.entries()) {
        await manager.update(
          AcademyLessonRecord,
          { id, chapterId },
          { position: index },
        );
      }
    });
  }
}
