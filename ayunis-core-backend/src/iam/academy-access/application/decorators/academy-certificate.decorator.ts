import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ACADEMY_CERTIFICATE_KEY = 'requiresAcademyCertificate';

/**
 * Marks a controller as part of the Ayunis Core chat surface, which orgs may
 * gate behind the KI-Führerschein certificate.
 *
 * Apply at class level: `AcademyCertificateGuard` only blocks state-changing
 * requests, so reads stay open and a blocked user keeps access to their chat
 * history.
 */
export const RequireAcademyCertificate = () =>
  SetMetadata(REQUIRE_ACADEMY_CERTIFICATE_KEY, true);
