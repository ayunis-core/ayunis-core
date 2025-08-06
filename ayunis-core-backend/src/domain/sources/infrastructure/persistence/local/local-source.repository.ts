import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { Source } from '../../../domain/source.entity';
import { FileSource } from '../../../domain/sources/file-source.entity';
import { UrlSource } from '../../../domain/sources/url-source.entity';
import { SourceRepository } from '../../../application/ports/source.repository';
import { SourceRecord } from './schema/source.record';
import { SourceMapper } from './mappers/source.mapper';

@Injectable()
export class LocalSourceRepository extends SourceRepository {
  private readonly logger = new Logger(LocalSourceRepository.name);

  constructor(
    @InjectRepository(SourceRecord)
    private readonly sourceRepository: Repository<SourceRecord>,
    private readonly sourceMapper: SourceMapper,
  ) {
    super();
  }

  async findById(id: UUID): Promise<Source | null> {
    const entity = await this.sourceRepository.findOne({
      where: { id },
      relations: {
        content: true,
      },
    });

    if (!entity) {
      return null;
    }

    return this.sourceMapper.toDomain(entity);
  }

  async create(source: Source): Promise<Source> {
    const entity = this.sourceMapper.toRecord(source);
    const savedEntity = await this.sourceRepository.save(entity);

    return this.sourceMapper.toDomain(savedEntity);
  }

  async createFileSource(source: FileSource): Promise<FileSource> {
    const entity = this.sourceMapper.fileSourceToRecord(source);
    this.logger.debug(`Saving file source`, {
      entity,
    });
    const savedEntity = await this.sourceRepository.save(entity);

    return this.sourceMapper.toDomain(savedEntity) as FileSource;
  }

  async createUrlSource(source: UrlSource): Promise<UrlSource> {
    const entity = this.sourceMapper.urlSourceToRecord(source);
    this.logger.debug(`Saving URL source: ${JSON.stringify(entity)}`, {
      entity,
    });
    const savedEntity = await this.sourceRepository.save(entity);

    return this.sourceMapper.toDomain(savedEntity) as UrlSource;
  }

  async update(source: Source): Promise<Source> {
    const entity = this.sourceMapper.toRecord(source);
    const savedEntity = await this.sourceRepository.save(entity);

    return this.sourceMapper.toDomain(savedEntity);
  }

  async delete(source: Source): Promise<void> {
    const record = this.sourceMapper.toRecord(source);
    await this.sourceRepository.remove(record);
  }
}
