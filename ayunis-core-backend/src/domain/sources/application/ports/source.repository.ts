import { UUID } from 'crypto';
import { Source } from '../../domain/source.entity';
import { FileSource } from '../../domain/sources/file-source.entity';
import { UrlSource } from '../../domain/sources/url-source.entity';

export const SOURCE_REPOSITORY = Symbol('SOURCE_REPOSITORY');

export abstract class SourceRepository {
  abstract findById(id: UUID): Promise<Source | null>;
  abstract create(source: Source): Promise<Source>;
  abstract createFileSource(source: FileSource): Promise<FileSource>;
  abstract createUrlSource(source: UrlSource): Promise<UrlSource>;
  abstract update(source: Source): Promise<Source>;
  abstract delete(id: UUID): Promise<void>;
}
