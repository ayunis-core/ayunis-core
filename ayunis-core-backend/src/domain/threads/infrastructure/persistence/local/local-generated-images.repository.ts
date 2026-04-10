import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import type { GeneratedImage } from '../../../domain/generated-image.entity';
import { GeneratedImageRecord } from './schema/generated-image.record';
import { GeneratedImagesRepository } from '../../../application/ports/generated-images.repository';
import { GeneratedImageMapper } from './mappers/generated-image.mapper';

@Injectable()
export class LocalGeneratedImagesRepository extends GeneratedImagesRepository {
  constructor(
    @InjectRepository(GeneratedImageRecord)
    private readonly repo: Repository<GeneratedImageRecord>,
    private readonly mapper: GeneratedImageMapper,
  ) {
    super();
  }

  async save(image: GeneratedImage): Promise<GeneratedImage> {
    const record = this.mapper.toRecord(image);
    const saved = await this.repo.save(record);
    return this.mapper.toDomain(saved);
  }

  async findById(id: UUID): Promise<GeneratedImage | null> {
    const record = await this.repo.findOne({ where: { id } });
    return record ? this.mapper.toDomain(record) : null;
  }

  async findByIdAndThreadId(
    id: UUID,
    threadId: UUID,
  ): Promise<GeneratedImage | null> {
    const record = await this.repo.findOne({ where: { id, threadId } });
    return record ? this.mapper.toDomain(record) : null;
  }
}
