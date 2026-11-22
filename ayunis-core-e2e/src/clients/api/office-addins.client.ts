import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';

// The manifest is XML for Microsoft 365, so it is not in the OpenAPI spec.
export function requestOutlookManifest(
  api: APIRequestContext,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.get(`${apiURL}/api/office-addins/outlook/manifest.xml`);
}
