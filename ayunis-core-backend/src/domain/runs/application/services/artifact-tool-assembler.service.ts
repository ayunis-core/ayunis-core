import { Injectable, Logger } from '@nestjs/common';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { AssembleToolCommand } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.command';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { FindArtifactsByThreadUseCase } from 'src/domain/artifacts/application/use-cases/find-artifacts-by-thread/find-artifacts-by-thread.use-case';
import { FindArtifactsByThreadQuery } from 'src/domain/artifacts/application/use-cases/find-artifacts-by-thread/find-artifacts-by-thread.query';
import { FindArtifactWithVersionsUseCase } from 'src/domain/artifacts/application/use-cases/find-artifact-with-versions/find-artifact-with-versions.use-case';
import { FindArtifactWithVersionsQuery } from 'src/domain/artifacts/application/use-cases/find-artifact-with-versions/find-artifact-with-versions.query';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import {
  Artifact,
  DiagramArtifact,
  DocumentArtifact,
  JsxArtifact,
} from 'src/domain/artifacts/domain/artifact.entity';
import { FindAllLetterheadsUseCase } from 'src/domain/letterheads/application/use-cases/find-all-letterheads/find-all-letterheads.use-case';
import type { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';
import { buildLetterheadSuffix } from './letterhead-suffix.helper';

type ArtifactSubclass<T extends Artifact> = abstract new (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- constructor type parameters vary across Artifact subclasses; used only for instanceof filtering
  ...args: any[]
) => T;

/**
 * Assembles artifact-related always-on tools (document, diagram, jsx) for a
 * thread. Lives outside ToolAssemblyService to keep that file under the
 * 500-line cap and to keep artifact-specific logic in one place.
 */
@Injectable()
export class ArtifactToolAssemblerService {
  private readonly logger = new Logger(ArtifactToolAssemblerService.name);

  constructor(
    private readonly assembleToolsUseCase: AssembleToolUseCase,
    private readonly findArtifactsByThreadUseCase: FindArtifactsByThreadUseCase,
    private readonly findArtifactWithVersionsUseCase: FindArtifactWithVersionsUseCase,
    private readonly findAllLetterheadsUseCase: FindAllLetterheadsUseCase,
  ) {}

  async assembleArtifactTools(thread: Thread): Promise<Tool[]> {
    const letterheads = await this.fetchLetterheadsSafe();
    const letterheadSuffix = buildLetterheadSuffix(letterheads);

    const threadArtifacts = await this.findArtifactsByThreadUseCase.execute(
      new FindArtifactsByThreadQuery({ threadId: thread.id }),
    );

    const tools: Tool[] = [];

    const createDocTool = await this.assembleToolsUseCase.execute(
      new AssembleToolCommand({ type: ToolType.CREATE_DOCUMENT }),
    );
    if (letterheadSuffix) {
      createDocTool.descriptionLong = `${createDocTool.descriptionLong ?? createDocTool.description}${letterheadSuffix}`;
    }
    tools.push(createDocTool);

    tools.push(
      ...(await this.assembleDocumentEditTools(
        threadArtifacts,
        letterheadSuffix,
      )),
    );

    tools.push(
      await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({ type: ToolType.CREATE_DIAGRAM }),
      ),
    );

    tools.push(
      ...(await this.assembleEditToolsForType({
        threadArtifacts,
        artifactClass: DiagramArtifact,
        updateToolType: ToolType.UPDATE_DIAGRAM,
        label: 'diagrams',
      })),
    );

    tools.push(
      await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({ type: ToolType.CREATE_JSX }),
      ),
    );

    tools.push(
      ...(await this.assembleEditToolsForType({
        threadArtifacts,
        artifactClass: JsxArtifact,
        updateToolType: ToolType.UPDATE_JSX,
        label: 'JSX artifacts',
      })),
    );

    return tools;
  }

  private async assembleDocumentEditTools(
    threadArtifacts: Artifact[],
    letterheadSuffix: string,
  ): Promise<Tool[]> {
    const documents = threadArtifacts.filter(
      (a): a is DocumentArtifact => a instanceof DocumentArtifact,
    );
    const artifactLines: string[] = [];
    for (const a of documents) {
      const full = await this.findArtifactWithVersionsUseCase.execute(
        new FindArtifactWithVersionsQuery({ artifactId: a.id }),
      );
      const cur = full.versions.find(
        (v) => v.versionNumber === full.currentVersionNumber,
      );
      const warn =
        cur?.authorType === AuthorType.USER
          ? ' (⚠ user-edited — use read_document before editing)'
          : '';
      artifactLines.push(`- ${a.id}: "${a.title}"${warn}`);
    }

    const suffix =
      artifactLines.length > 0
        ? `\n\nAvailable documents in this conversation:\n${artifactLines.join('\n')}`
        : '';

    const toolTypes = [
      ToolType.UPDATE_DOCUMENT,
      ToolType.EDIT_DOCUMENT,
      ToolType.READ_DOCUMENT,
    ];
    const tools: Tool[] = [];
    for (const type of toolTypes) {
      const tool = await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({ type }),
      );
      const extra =
        type === ToolType.UPDATE_DOCUMENT
          ? `${suffix}${letterheadSuffix}`
          : suffix;
      if (extra) {
        tool.descriptionLong = `${tool.descriptionLong ?? tool.description}${extra}`;
      }
      tools.push(tool);
    }
    return tools;
  }

  private async assembleEditToolsForType<T extends Artifact>(params: {
    threadArtifacts: Artifact[];
    artifactClass: ArtifactSubclass<T>;
    updateToolType: ToolType;
    label: string;
  }): Promise<Tool[]> {
    const { threadArtifacts, artifactClass, updateToolType, label } = params;

    const matching = threadArtifacts.filter(
      (a): a is T => a instanceof artifactClass,
    );
    if (matching.length === 0) {
      return [];
    }

    const artifactLines = matching.map((a) => `- ${a.id}: "${a.title}"`);
    const suffix = `\n\nAvailable ${label} in this conversation:\n${artifactLines.join('\n')}`;

    const tool = await this.assembleToolsUseCase.execute(
      new AssembleToolCommand({ type: updateToolType }),
    );
    tool.descriptionLong = `${tool.descriptionLong ?? tool.description}${suffix}`;
    return [tool];
  }

  private async fetchLetterheadsSafe(): Promise<Letterhead[]> {
    try {
      return await this.findAllLetterheadsUseCase.execute();
    } catch (error) {
      this.logger.warn('Failed to fetch letterheads, continuing without them', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }
}
