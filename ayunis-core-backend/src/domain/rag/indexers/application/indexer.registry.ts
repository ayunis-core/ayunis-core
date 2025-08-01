import { Injectable } from '@nestjs/common';
import { IndexerPort } from './ports/indexer';
import { IndexType } from '../domain/value-objects/index-type.enum';

@Injectable()
export class IndexRegistry {
  private readonly indices: Map<IndexType, IndexerPort> = new Map();

  register(type: IndexType, index: IndexerPort): void {
    this.indices.set(type, index);
  }

  get(type: IndexType): IndexerPort {
    const index = this.indices.get(type);
    if (!index) {
      throw new Error(`Index type ${type} not found`);
    }
    return index;
  }

  getAll(): IndexerPort[] {
    return Array.from(this.indices.values());
  }
}
