import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AssembleToolCommand } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.command';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { ToolLoadingPolicyService } from './tool-loading-policy.service';

@Injectable()
export class DeferredToolLoadingService {
  constructor(
    private readonly policy: ToolLoadingPolicyService,
    private readonly assembleToolUseCase: AssembleToolUseCase,
    @InjectPinoLogger(DeferredToolLoadingService.name)
    private readonly logger: PinoLogger,
  ) {}

  async apply(
    tools: Tool[],
    activatedToolNames: ReadonlySet<string>,
    enabled: boolean,
  ): Promise<Tool[]> {
    if (!enabled) return tools;
    const selection = this.policy.select(tools, activatedToolNames);
    if (selection.deferredTools.length === 0) return selection.loadedTools;
    this.logSelection(tools, selection.loadedTools, selection.deferredTools);
    const loadTools = await this.assembleToolUseCase.execute(
      new AssembleToolCommand({
        type: ToolType.LOAD_TOOLS,
        context: selection.deferredTools,
      }),
    );
    return [...selection.loadedTools, loadTools];
  }

  private logSelection(
    candidates: Tool[],
    loaded: Tool[],
    deferred: Tool[],
  ): void {
    this.logger.debug(
      {
        candidateToolCount: candidates.length,
        loadedToolCount: loaded.length + 1,
        deferredToolCount: deferred.length,
        loadedSchemaBytes: loaded.reduce(
          (total, tool) =>
            total + Buffer.byteLength(JSON.stringify(tool.parameters)),
          0,
        ),
      },
      'Applied deferred tool loading',
    );
  }
}
