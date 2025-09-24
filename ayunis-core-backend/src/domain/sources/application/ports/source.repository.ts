import { UUID } from 'crypto';
import { TextSource } from '../../domain/sources/text-source.entity';
import { DataSource } from '../../domain/sources/data-source.entity';
import { Source } from '../../domain/source.entity';

export abstract class SourceRepository {
  abstract findById(id: UUID): Promise<TextSource | DataSource | null>;
  abstract save(source: Source): Promise<Source>;
  abstract delete(source: Source): Promise<void>;
}
