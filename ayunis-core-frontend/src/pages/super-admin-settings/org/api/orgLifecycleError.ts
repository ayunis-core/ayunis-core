import { OrgErrorCode } from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
export function orgLifecycleErrorKey(error: unknown): string {
  try {
    const { code } = extractErrorData(error);
    switch (code) {
      case OrgErrorCode.ORG_NOT_FOUND:
        return 'lifecycle.errorNotFound';
      case OrgErrorCode.ORG_DELETE_CONFIRMATION_MISMATCH:
        return 'lifecycle.confirmationMismatch';
      case OrgErrorCode.ORG_PROCESSING_ACTIVE:
        return 'lifecycle.processingActive';
      case OrgErrorCode.ORG_DELETION_FAILED:
        return 'lifecycle.cleanupIncomplete';
      case OrgErrorCode.ORG_UNAUTHORIZED:
        return 'lifecycle.errorUnauthorized';
      default:
        return 'lifecycle.error';
    }
  } catch {
    return 'lifecycle.error';
  }
}
