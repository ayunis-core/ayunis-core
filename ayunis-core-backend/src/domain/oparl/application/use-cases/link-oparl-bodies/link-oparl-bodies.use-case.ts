import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { OparlBodyLinksRepository } from 'src/domain/oparl/application/ports/oparl-body-links.repository';
import {
  OparlBodyNotFoundError,
  UnexpectedOparlError,
} from 'src/domain/oparl/application/oparl.errors';
import { OparlBodyLink } from 'src/domain/oparl/domain/oparl-body-link.entity';
import { LinkOparlBodiesCommand } from './link-oparl-bodies.command';

/** Links bodies to the current org; a body it already linked keeps its link. */
@Injectable()
export class LinkOparlBodiesUseCase {
  private readonly logger = new Logger(LinkOparlBodiesUseCase.name);

  constructor(
    private readonly links: OparlBodyLinksRepository,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOparlError)
  async execute(command: LinkOparlBodiesCommand): Promise<void> {
    const { orgId, userId } = getRequiredUserContext(this.context);
    this.logger.log(
      { orgId, bodyIds: command.bodyIds },
      'Linking OParl bodies',
    );
    const linked = await this.links.link(
      command.bodyIds.map(
        (bodyId) =>
          new OparlBodyLink({ orgId, bodyId, linkedByUserId: userId }),
      ),
    );
    if (!linked) throw new OparlBodyNotFoundError(command.bodyIds);
  }
}
