import { json, type OptionsJson } from 'body-parser';
import type { RequestHandler } from 'express';

export const MALFORMED_JSON_BODY = 'MALFORMED_JSON_BODY';

// Tag before next(error): Express instrumentation records the error there.
// Preserve the SyntaxError instance so Nest still maps it to HTTP 400.
export function jsonBodyParser(options: OptionsJson): RequestHandler {
  const parse = json(options);
  return function classifyingJsonParser(req, res, next) {
    parse(req, res, (error?: unknown) => next(tagMalformedJsonBody(error)));
  };
}

export function tagMalformedJsonBody<T>(error: T): T {
  if (isBodyParserParseFailure(error)) {
    Object.assign(error, { code: MALFORMED_JSON_BODY });
  }
  return error;
}

function isBodyParserParseFailure(error: unknown): error is Error {
  return (
    error instanceof Error &&
    'type' in error &&
    error.type === 'entity.parse.failed' &&
    'status' in error &&
    error.status === 400
  );
}
