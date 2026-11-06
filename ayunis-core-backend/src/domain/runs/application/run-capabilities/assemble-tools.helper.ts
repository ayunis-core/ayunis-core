import { AssembleToolCommand } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.command';
import type { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import type { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

/** Assembles tools of the given types, in order, sharing one tool context. */
export function assembleTools(
  assembleToolUseCase: AssembleToolUseCase,
  types: readonly ToolType[],
  context?: unknown,
): Promise<Tool[]> {
  return Promise.all(
    types.map((type) =>
      assembleToolUseCase.execute(new AssembleToolCommand({ type, context })),
    ),
  );
}
