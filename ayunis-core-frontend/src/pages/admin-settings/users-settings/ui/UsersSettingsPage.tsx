import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
import InviteMenuButton from './InviteMenuButton';
import InvitesSection from './InvitesSection';
import InvitesSearch from './InvitesSearch';
import InvitesPagination from './InvitesPagination';
import UsersSection from './UsersSection';
import UsersSearch from './UsersSearch';
import UsersPagination from './UsersPagination';
import type { Invite } from '@/pages/admin-settings/users-settings/model/openapi';
import type {
  InvitesSortField,
  OrgUsersSortField,
  UserResponseDto,
  PaginationDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { TableSort } from '@/shared/lib/table-sort';

interface UsersSettingsPageProps {
  invites: Invite[];
  invitesPagination?: PaginationDto;
  invitesSearch?: string;
  invitesCurrentPage: number;
  users: UserResponseDto[];
  pagination?: PaginationDto;
  search?: string;
  currentPage: number;
  usersSort: TableSort<OrgUsersSortField>;
  invitesSort: TableSort<InvitesSortField>;
}

export default function UsersSettingsPage({
  invites,
  invitesPagination,
  invitesSearch,
  invitesCurrentPage,
  users,
  pagination,
  search,
  currentPage,
  usersSort,
  invitesSort,
}: Readonly<UsersSettingsPageProps>) {
  const { t } = useTranslation('admin-settings-layout');
  const navigate = useNavigate({ from: '/admin-settings/users' });
  const total = pagination?.total ?? 0;
  const limit = pagination?.limit ?? 25;
  const totalPages = Math.ceil(total / limit);

  const invitesTotal = invitesPagination?.total ?? 0;
  const invitesLimit = invitesPagination?.limit ?? 10;
  const invitesTotalPages = Math.ceil(invitesTotal / invitesLimit);

  return (
    <SettingsLayout
      action={
        <div className="flex gap-2">
          <HelpLink path="settings/admin/users/" />
          <OnboardingTourTarget name={TOUR_TARGET.inviteUsers}>
            <InviteMenuButton />
          </OnboardingTourTarget>
        </div>
      }
      title={t('layout.users')}
    >
      <div className="space-y-4">
        {}
        {(invites.length > 0 || invitesSearch || invitesTotal > 0) && (
          <InvitesSection
            invites={invites}
            totalInvites={invitesTotal}
            sort={invitesSort}
            onSort={(next) =>
              void navigate({
                search: (previous) => ({
                  ...previous,
                  invitesSortBy: next.sortBy,
                  invitesSortOrder: next.sortOrder,
                  invitesPage: undefined,
                }),
              })
            }
            searchSlot={<InvitesSearch search={invitesSearch} />}
            paginationSlot={
              <InvitesPagination
                currentPage={invitesCurrentPage}
                totalPages={invitesTotalPages}
                search={invitesSearch}
              />
            }
          />
        )}
        <UsersSection
          users={users}
          total={total}
          sort={usersSort}
          onSort={(next) =>
            void navigate({
              search: (previous) => ({ ...previous, ...next, page: undefined }),
            })
          }
          searchSlot={<UsersSearch search={search} />}
          paginationSlot={
            <UsersPagination
              currentPage={currentPage}
              totalPages={totalPages}
              search={search}
              sort={usersSort}
            />
          }
        />
      </div>
    </SettingsLayout>
  );
}
