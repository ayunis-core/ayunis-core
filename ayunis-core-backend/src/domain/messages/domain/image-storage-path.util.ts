/**
 * Utility functions for computing deterministic image storage paths.
 * Path format: <orgId>/<threadId>/<messageId>/<index>.<ext>
 */

import { contentTypeToExtension } from 'src/common/util/content-type.util';

// Re-export for backwards compatibility with existing callers in the
// messages domain; the canonical definition lives in content-type.util.ts.
export { isAllowedImageContentType } from 'src/common/util/content-type.util';

export function getImageStoragePath(params: {
  orgId: string;
  threadId: string;
  messageId: string;
  index: number;
  contentType: string;
}): string {
  const ext = contentTypeToExtension(params.contentType);
  return `${params.orgId}/${params.threadId}/${params.messageId}/${params.index}${ext}`;
}
