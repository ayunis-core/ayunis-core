import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { AcademySettingsPage } from '@/pages/admin-settings/academy-settings';
import { isAcademyAddonActive } from '@/features/academy';
import {
  addonsControllerList,
  getAddonsControllerListQueryKey,
  academyAccessControllerListOrgCertificates,
  getAcademyAccessControllerListOrgCertificatesQueryKey,
  academyAccessControllerGetOrgSettings,
  getAcademyAccessControllerGetOrgSettingsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { CertificateValidityStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { isStatusReachable } from '@/pages/admin-settings/academy-settings';

const MEMBERS_PER_PAGE = 25;

const searchSchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(CertificateValidityStatus).optional().catch(undefined),
  page: z.number().min(1).optional().catch(1),
});

export const Route = createFileRoute('/_authenticated/admin-settings/academy')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  component: RouteComponent,
  beforeLoad: ({ context: { user } }) => {
    if (user.role !== 'admin') {
      throw redirect({ to: '/' });
    }
  },
  // Without the add-on there is no certificate to require, so the setting has
  // no meaning — the sidebar hides the entry for the same reason.
  loader: async ({
    deps: { search, status, page = 1 },
    context: { queryClient },
  }) => {
    const addons = await queryClient.fetchQuery({
      queryKey: getAddonsControllerListQueryKey(),
      queryFn: () => addonsControllerList(),
    });
    if (!isAcademyAddonActive(addons)) {
      throw redirect({ to: '/admin-settings/users' });
    }

    // The mode is read first, and the statuses derived from it second, so the
    // table, its renewal column and its filter all describe one snapshot. It
    // costs a serial indexed lookup; reading the mode from a separate client
    // query instead produced a column that disagreed with the rows.
    const orgSettings = await queryClient.fetchQuery({
      queryKey: getAcademyAccessControllerGetOrgSettingsQueryKey(),
      queryFn: () => academyAccessControllerGetOrgSettings(),
    });

    // `expiring_soon` and `expired` cannot occur unless the org renews
    // annually, so a leftover filter — from a mode switch or a shared link —
    // would render an empty table rather than "no such state here".
    const effectiveStatus = isStatusReachable(status, orgSettings.mode)
      ? status
      : undefined;

    const params = {
      search,
      status: effectiveStatus,
      limit: MEMBERS_PER_PAGE,
      offset: (page - 1) * MEMBERS_PER_PAGE,
    };
    const certificatesResponse = await queryClient.fetchQuery({
      queryKey: getAcademyAccessControllerListOrgCertificatesQueryKey(params),
      queryFn: () => academyAccessControllerListOrgCertificates(params),
    });

    return {
      certificatesResponse,
      mode: orgSettings.mode,
      search,
      status: effectiveStatus,
      page,
    };
  },
});

function RouteComponent() {
  const { certificatesResponse, mode, search, status, page } =
    Route.useLoaderData();

  return (
    <AcademySettingsPage
      certificates={certificatesResponse.data}
      pagination={certificatesResponse.pagination}
      mode={mode}
      currentPage={page}
      search={search}
      status={status}
    />
  );
}
