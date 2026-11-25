import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { OparlLinkedBody } from 'src/domain/oparl/application/models/oparl-linked-body';
import { OparlBodyLinksRepository } from 'src/domain/oparl/application/ports/oparl-body-links.repository';
import { UnexpectedOparlError } from 'src/domain/oparl/application/oparl.errors';
import { FindLinkedOparlBodiesQuery } from './find-linked-oparl-bodies.query';

/** The bodies an org linked: the scope of everything the org may read from the mirror. */
@Injectable()
export class FindLinkedOparlBodiesUseCase {
  private readonly logger = new Logger(FindLinkedOparlBodiesUseCase.name);

  constructor(private readonly links: OparlBodyLinksRepository) {}

  @HandleUnexpectedErrors(UnexpectedOparlError)
  async execute(query: FindLinkedOparlBodiesQuery): Promise<OparlLinkedBody[]> {
    this.logger.log({ orgId: query.orgId }, 'Finding linked OParl bodies');
    return this.links.findLinked(query.orgId);
  }
}
