import { mockTextResponse, mockToolCallResponse } from './mock-chunk-responses';
import type {
  ProviderChunk,
  ProviderRequest,
  ToolResultContent,
} from '@ayunis/inference';

const SUMMARIZE_PROMPT = 'Summarize this email.';
const DRAFT_REPLY_PROMPT = 'Draft a reply to this email.';
const READ_EMAIL_TOOL = 'outlook__read_email';
const DRAFT_EMAIL_TOOL = 'outlook__draft_email';
const DRAFT_REPLY_BODY = 'E2E mock reply';
const CALL_ID_PREFIX = 'mock-outlook-';

/**
 * Answers the English prompts of the Outlook pane's quick actions with the
 * pane's client-executed tools. Summarizing reads the open email and, once
 * the pane posted the result back, answers with its subject, so a reply
 * proves the result reached the model. Drafting a reply asks the pane to
 * insert a fixed text.
 */
export function mockOutlookToolResponse(
  request: ProviderRequest,
  userText: string,
): AsyncIterable<ProviderChunk> | null {
  if (userText === SUMMARIZE_PROMPT && offers(request, READ_EMAIL_TOOL)) {
    const result = outlookResultSinceLastUserMessage(request);
    return result
      ? mockTextResponse(`outlook-summary::${emailSubject(result.result)}`)
      : mockToolCallResponse(CALL_ID_PREFIX, READ_EMAIL_TOOL, {});
  }
  if (userText === DRAFT_REPLY_PROMPT && offers(request, DRAFT_EMAIL_TOOL)) {
    return mockToolCallResponse(CALL_ID_PREFIX, DRAFT_EMAIL_TOOL, {
      body: DRAFT_REPLY_BODY,
    });
  }
  return null;
}

function offers(request: ProviderRequest, toolName: string): boolean {
  return request.tools.some((tool) => tool.name === toolName);
}

function outlookResultSinceLastUserMessage(
  request: ProviderRequest,
): ToolResultContent | undefined {
  const lastUser = request.messages.findLastIndex(
    (message) => message.role === 'user',
  );
  return request.messages
    .slice(lastUser + 1)
    .flatMap((message) => message.content)
    .find(
      (part): part is ToolResultContent =>
        part.type === 'tool_result' &&
        part.toolCallId.startsWith(CALL_ID_PREFIX),
    );
}

function emailSubject(result: string): string {
  try {
    const email: unknown = JSON.parse(result);
    if (
      typeof email === 'object' &&
      email !== null &&
      'subject' in email &&
      typeof email.subject === 'string'
    ) {
      return email.subject;
    }
  } catch {
    // Not JSON: use the result as it is.
  }
  return result;
}
