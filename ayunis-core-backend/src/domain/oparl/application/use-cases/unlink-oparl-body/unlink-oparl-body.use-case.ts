import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { OparlBodyLinksRepository } from 'src/domain/oparl/application/ports/oparl-body-links.repository';
import {
  OparlBodyNotLinkedError,
  UnexpectedOparlError,
} from 'src/domain/oparl/application/oparl.errors';
import { UnlinkOparlBodyCommand } from './unlink-oparl-body.command';

/** Removes the current org's link; the mirrored body stays. */
@Injectable()
export class UnlinkOparlBodyUseCase {
  private readonly logger = new Logger(UnlinkOparlBodyUseCase.name);

  constructor(
    private readonly links: OparlBodyLinksRepository,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOparlError)
  async execute(command: UnlinkOparlBodyCommand): Promise<void> {
    const { orgId } = getRequiredUserContext(this.context);
    this.logger.log({ orgId, bodyId: command.bodyId }, 'Unlinking OParl body');
    if (!(await this.links.unlink(orgId, command.bodyId)))
      throw new OparlBodyNotLinkedError(command.bodyId);
  }
}
