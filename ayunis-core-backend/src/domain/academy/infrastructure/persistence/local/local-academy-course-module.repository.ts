import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { UUID } from 'crypto';

import { AcademyCourseModuleRepository } from '../../../application/ports/academy-course-module.repository';
import { AcademyCourseModule } from '../../../domain/academy-course-module.entity';
import { AcademyCourseModuleRecord } from './schema/academy-course-module.record';
import { AcademyMapper } from './mappers/academy.mapper';
import { CourseModuleNotFoundError } from '../../../application/academy.errors';

@Injectable()
export class LocalAcademyCourseModuleRepository implements AcademyCourseModuleRepository {
  private readonly logger = new Logger(LocalAcademyCourseModuleRepository.name);

  constructor(
    @InjectRepository(AcademyCourseModuleRecord)
    private readonly repository: Repository<AcademyCourseModuleRecord>,
    private readonly dataSource: DataSource,
    private readonly mapper: AcademyMapper,
  ) {}

  async findOne(id: UUID): Promise<AcademyCourseModule | null> {
    this.logger.log('findOne', { id });
    const record = await this.repository.findOne({ where: { id } });
    if (!record) return null;
    return this.mapper.courseModuleToDomain(record);
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

  async create(
    courseModule: AcademyCourseModule,
  ): Promise<AcademyCourseModule> {
    this.logger.log('create', { title: courseModule.title });
    const record = this.mapper.courseModuleToRecord(courseModule);
    const saved = await this.repository.save(record);
    return this.mapper.courseModuleToDomain(saved);
  }

  async update(
    courseModule: AcademyCourseModule,
  ): Promise<AcademyCourseModule> {
    this.logger.log('update', { id: courseModule.id });
    const record = this.mapper.courseModuleToRecord(courseModule);
    const saved = await this.repository.save(record);
    return this.mapper.courseModuleToDomain(saved);
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log('delete', { id });
    const result = await this.repository.delete({ id });
    if (result.affected === 0) {
      throw new CourseModuleNotFoundError(id);
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
          AcademyCourseModuleRecord,
          { id, chapterId },
          { position: index },
        );
      }
    });
  }
}
