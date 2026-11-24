import type { UUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { getRequiredOrgId } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import type { OparlReadScope } from 'src/domain/oparl/application/models/oparl-search';
import { OparlBodyLinksRepository } from 'src/domain/oparl/application/ports/oparl-body-links.repository';

/**
 * The bodies the current org may read, looked up on every read so a link
 * removed during a chat applies to its next tool call.
 */
@Injectable()
export class OparlReadScopeService {
  constructor(
    private readonly links: OparlBodyLinksRepository,
    private readonly context: ContextService,
  ) {}

  /** The linked bodies; with `bodyIds`, only those of them that are linked. */
  async resolve(bodyIds?: readonly UUID[]): Promise<OparlReadScope> {
    const orgId = getRequiredOrgId(this.context);
    const linked = (await this.links.findLinked(orgId)).map(({ id }) => id);
    if (!bodyIds?.length) return { bodyIds: linked };
    const requested = new Set(bodyIds);
    return { bodyIds: linked.filter((id) => requested.has(id)) };
  }
}
