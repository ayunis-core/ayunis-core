import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { CreateThreadCommand } from './create-thread.command';
import {
  ConflictingModelSelectionError,
  ModelModeUnavailableError,
  NoModelProvidedError,
  ThreadCreationError,
  UnexpecteThreadError,
} from 'src/domain/threads/application/threads.errors';
import { GetPermittedLanguageModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { GetPermittedLanguageModelQuery } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.query';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ResolveModelModesUseCase } from 'src/domain/models/application/use-cases/resolve-model-modes/resolve-model-modes.use-case';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import {
  ThreadOriginKind,
  type ThreadOrigin,
} from 'src/domain/threads/domain/thread-origin';
import { FindNotificationUseCase } from 'src/domain/notifications/application/use-cases/find-notification/find-notification.use-case';
import { FindNotificationQuery } from 'src/domain/notifications/application/use-cases/find-notification/find-notification.query';
import { FindReleaseNoteUseCase } from 'src/domain/release-notes/application/use-cases/find-release-note/find-release-note.use-case';
import { FindReleaseNoteQuery } from 'src/domain/release-notes/application/use-cases/find-release-note/find-release-note.query';

@Injectable()
export class CreateThreadUseCase {
  private readonly logger = new Logger(CreateThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly getPermittedLanguageModelUseCase: GetPermittedLanguageModelUseCase,
    private readonly contextService: ContextService,
    private readonly resolveModelModesUseCase: ResolveModelModesUseCase,
    private readonly workspaceReadAccess: AssertWorkspaceReadAccessUseCase,
    private readonly findNotificationUseCase: FindNotificationUseCase,
    private readonly findReleaseNoteUseCase: FindReleaseNoteUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(command: CreateThreadCommand): Promise<Thread> {
    this.logger.log('execute');
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const model = await this.resolveModel(command, userId);
    const isAnonymous = model.anonymousOnly || (command.isAnonymous ?? false);

    await this.assertLinksReadable(command);

    try {
      const thread = new Thread({
        userId,
        model,
        mode: command.mode,
        isAnonymous,
        workspaceId: command.workspaceId,
        title: command.title,
        origin: command.origin,
        client: this.contextService.get('client') ?? null,
        messages: [],
      });
      const createdThread = await this.threadsRepository.create(thread);
      return new Thread({
        ...createdThread,
      });
    } catch (error) {
      this.logger.error(
        {
          userId,
          err: error as Error,
        },
        'Failed to create thread',
      );
      throw new ThreadCreationError(error as Error, userId);
    }
  }

  private async assertLinksReadable(
    command: CreateThreadCommand,
  ): Promise<void> {
    // Throws WorkspaceNotFoundError for an id the caller does not own.
    if (command.workspaceId) {
      await this.workspaceReadAccess.execute({
        workspaceId: command.workspaceId,
      });
    }
    await this.assertOriginReadable(command.origin);
  }

  private async assertOriginReadable(origin?: ThreadOrigin): Promise<void> {
    // Throws NotificationNotFoundError for an id the caller does not own.
    if (
      origin?.kind === ThreadOriginKind.NOTIFICATION &&
      origin.notificationId
    ) {
      await this.findNotificationUseCase.execute(
        new FindNotificationQuery(origin.notificationId),
      );
    }
    // Throws ReleaseNoteNotFoundError for a release note that does not exist.
    if (
      origin?.kind === ThreadOriginKind.RELEASE_NOTE &&
      origin.releaseNoteId
    ) {
      await this.findReleaseNoteUseCase.execute(
        new FindReleaseNoteQuery(origin.releaseNoteId),
      );
    }
  }

  private async resolveModel(
    command: CreateThreadCommand,
    userId: string,
  ): Promise<PermittedLanguageModel> {
    if (command.modelId && command.mode) {
      throw new ConflictingModelSelectionError();
    }
    if (command.mode) {
      return this.resolveMode(command.mode, command.isAnonymous ?? false);
    }
    if (!command.modelId) {
      throw new NoModelProvidedError(userId);
    }
    return this.getPermittedLanguageModelUseCase.execute(
      new GetPermittedLanguageModelQuery({
        id: command.modelId,
      }),
    );
  }

  private async resolveMode(
    mode: ModelMode,
    isAnonymous: boolean,
  ): Promise<PermittedLanguageModel> {
    const resolutions = await this.resolveModelModesUseCase.execute();
    const resolution = resolutions.find((r) => r.mode === mode);
    // A mode with only anonymous-only candidates still binds; execute() then
    // marks the thread anonymous because the model requires it.
    const model = isAnonymous
      ? resolution?.anonymousPermittedModel
      : (resolution?.permittedModel ?? resolution?.anonymousPermittedModel);
    if (!model) {
      throw new ModelModeUnavailableError(mode);
    }
    return model;
  }
}
