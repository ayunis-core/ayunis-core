import type { APIRequestContext, APIResponse } from "@playwright/test";
import { config } from "../../config";
import type {
  OrgCertificateStatusResponseDto,
  AcademyAccessControllerExportOrgCertificatesParams,
} from "../generated/ayunisCoreAPI.schemas";
import { generatedApi } from "./generated-api";

export async function findOrgCertificateByEmail(
  api: APIRequestContext,
  email: string,
): Promise<OrgCertificateStatusResponseDto> {
  const page = await generatedApi.academyAccessControllerListOrgCertificates(
    { search: email },
    { api },
  );
  const entry = page.data.find((candidate) => candidate.email === email);
  if (!entry) throw new Error(`No certificate overview entry for ${email}`);
  return entry;
}

// Raw responses so specs can assert the denied statuses; the generated client
// throws on non-2xx.
export function requestCertificateOverviewExport(
  api: APIRequestContext,
  params?: AcademyAccessControllerExportOrgCertificatesParams,
): Promise<APIResponse> {
  return api.get(
    `${config.apiURL}/api/academy-access/org-certificates/export.csv`,
    { params },
  );
}

export function requestMemberCertificate(
  api: APIRequestContext,
  userId: string,
): Promise<APIResponse> {
  return api.get(
    `${config.apiURL}/api/academy-access/org-certificates/${userId}/certificate`,
  );
}
