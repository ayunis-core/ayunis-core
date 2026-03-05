import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { ShareScopeResolverService } from '../../services/share-scope-resolver.service';
import { ResolveShareScopeUserIdsQuery } from './resolve-share-scope-user-ids.query';

@Injectable()
export class ResolveShareScopeUserIdsUseCase {
  constructor(
    private readonly shareScopeResolverService: ShareScopeResolverService,
  ) {}

  async execute(query: ResolveShareScopeUserIdsQuery): Promise<Set<UUID>> {
    return this.shareScopeResolverService.resolveUserIds(query.scopes);
  }
}
