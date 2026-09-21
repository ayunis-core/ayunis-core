import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { AddFavoriteCommand } from 'src/domain/favorites/application/use-cases/add-favorite/add-favorite.command';
import { AddFavoriteUseCase } from 'src/domain/favorites/application/use-cases/add-favorite/add-favorite.use-case';
import { FavoriteReferenceType } from 'src/domain/favorites/domain/value-objects/favorite-reference-type.enum';
import { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { assertValidWorkspaceFields } from 'src/domain/workspaces/application/util/workspace-fields';
import { CreateWorkspaceCommand } from './create-workspace.command';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class CreateWorkspaceUseCase {
  private readonly logger = new Logger(CreateWorkspaceUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly contextService: ContextService,
    private readonly addFavoriteUseCase: AddFavoriteUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: CreateWorkspaceCommand): Promise<Workspace> {
    this.logger.log('Creating workspace');

    assertValidWorkspaceFields({
      name: command.name,
      description: command.description ?? null,
      icon: command.icon,
      color: command.color,
    });

    const { userId, orgId } = this.resolveOwner();
    const workspace = new Workspace({
      userId,
      orgId,
      name: command.name,
      description: command.description,
      icon: command.icon,
      color: command.color,
    });

    const saved = await this.workspacesRepository.save(workspace);
    await this.addFavoriteUseCase.execute(
      new AddFavoriteCommand(
        saved.userId,
        FavoriteReferenceType.Workspace,
        saved.id,
      ),
    );
    return saved;
  }

  private resolveOwner(): { userId: UUID; orgId: UUID } {
    const { userId, orgId } = getRequiredUserContext(this.contextService);
    return { userId, orgId };
  }
}
