import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { RetrieveUrlUseCase } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.use-case';
import { RetrieveUrlCommand } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.command';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { WebsiteContentTool } from 'src/domain/tools/domain/tools/website-content-tool.entity';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { CrawlDomainAccessDeniedError } from 'src/domain/crawl-domain-grants/application/crawl-domain-grants.errors';
import toolsConfig from 'src/config/tools.config';
import {
  paginateText,
  type TextPaginationResult,
} from 'src/domain/tools/application/utils/text-extraction.utils';
import type { UrlRetrieverResult } from 'src/domain/retrievers/url-retrievers/domain/url-retriever-result.entity';

type WebsiteContentSection = 'content' | 'links';

interface WebsiteContentResult {
  url: string;
  websiteTitle: string;
  metadata: Record<string, unknown>;
  section: WebsiteContentSection;
  contentTotalLines: number;
  linkTotalLines: number;
  totalLines: number;
  requestedStartLine: number;
  requestedNumLines: number;
  actualStartLine: number;
  actualEndLine: number;
  truncated: boolean;
  truncationReasons: TextPaginationResult['truncationReasons'];
  content?: string;
  links?: string[];
  nextPage: {
    url: string;
    section: WebsiteContentSection;
    startLine: number;
    numLines: number;
  } | null;
  paginationHint: string | null;
  linksPage: {
    url: string;
    section: 'links';
    startLine: 1;
    numLines: number;
  } | null;
}

@Injectable()
export class WebsiteContentToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(WebsiteContentToolHandler.name);

  constructor(
    private readonly retrieveUrlUseCase: RetrieveUrlUseCase,
    @Inject(toolsConfig.KEY)
    private readonly config: ConfigType<typeof toolsConfig>,
  ) {
    super();
  }

  async execute(params: {
    tool: WebsiteContentTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    this.logger.log({ name: tool.name, input: input }, 'execute');
    try {
      const {
        url,
        section = 'content',
        startLine = 1,
        numLines = this.config.sourceGetText.maxLines,
      } = tool.validateParams(input);
      const content = await this.retrieveUrlUseCase.execute(
        new RetrieveUrlCommand(url, context.orgId),
      );
      return JSON.stringify(
        this.buildResult(content, section, startLine, numLines, tool.name),
      );
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      // Preserve the crawl access-denial as-is so it stays a neutral 404
      // (hide-existence) outcome and its message is not exposed to the LLM.
      if (error instanceof CrawlDomainAccessDeniedError) {
        throw error;
      }
      this.logger.error({ err: error }, 'execute');
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: true,
      });
    }
  }

  private buildResult(
    result: UrlRetrieverResult,
    section: WebsiteContentSection,
    startLine: number,
    numLines: number,
    toolName: string,
  ): WebsiteContentResult {
    const linksText = result.links.join('\n');
    const { contentLines, linkLines } = this.countSectionLines(
      result.content,
      linksText,
      toolName,
    );
    const selectedText = section === 'content' ? result.content : linksText;
    const page = paginateText({
      toolName,
      text: selectedText,
      startLine,
      numLines,
      ...this.config.sourceGetText,
    });
    return {
      url: result.url,
      websiteTitle: result.websiteTitle,
      metadata: result.metadata,
      section,
      contentTotalLines: contentLines,
      linkTotalLines: linkLines,
      totalLines: page.totalLines,
      requestedStartLine: startLine,
      requestedNumLines: numLines,
      actualStartLine: page.actualStartLine,
      actualEndLine: page.actualEndLine,
      truncated: page.truncated,
      truncationReasons: page.truncationReasons,
      ...this.sectionPayload(section, page.extractedText),
      nextPage: page.nextStartLine
        ? { url: result.url, section, startLine: page.nextStartLine, numLines }
        : null,
      paginationHint: page.nextStartLine
        ? `Call website_content again with section "${section}" and startLine ${page.nextStartLine} to continue.`
        : null,
      linksPage:
        section === 'content' && linkLines > 0
          ? { url: result.url, section: 'links', startLine: 1, numLines }
          : null,
    };
  }

  private sectionPayload(
    section: WebsiteContentSection,
    text: string,
  ): Pick<WebsiteContentResult, 'content' | 'links'> {
    return section === 'content'
      ? { content: text }
      : { links: text === '' ? [] : text.split('\n') };
  }

  private countSectionLines(
    content: string,
    links: string,
    toolName: string,
  ): { contentLines: number; linkLines: number } {
    const count = (text: string): number =>
      paginateText({
        toolName,
        text,
        startLine: 1,
        numLines: 1,
        ...this.config.sourceGetText,
      }).totalLines;
    return { contentLines: count(content), linkLines: count(links) };
  }
}
