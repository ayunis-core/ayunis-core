import type { UUID } from 'crypto';
import type { TextSource } from '../../domain/sources/text-source.entity';
import type { DataSource } from '../../domain/sources/data-source.entity';
import type { Source } from '../../domain/source.entity';

export abstract class SourceRepository {
  abstract findById(id: UUID): Promise<TextSource | DataSource | null>;
  abstract findByIds(ids: UUID[]): Promise<Source[]>;
  abstract save(source: Source): Promise<Source>;
  abstract delete(source: Source): Promise<void>;
  abstract deleteMany(sourceIds: UUID[]): Promise<void>;
}
