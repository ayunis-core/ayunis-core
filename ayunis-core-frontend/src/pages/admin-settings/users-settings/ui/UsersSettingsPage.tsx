import SettingsLayout from '../../admin-settings-layout';
import InviteMenuButton from './InviteMenuButton';
import InvitesSection from './InvitesSection';
import InvitesSearch from './InvitesSearch';
import InvitesPagination from './InvitesPagination';
import UsersSection from './UsersSection';
import UsersSearch from './UsersSearch';
import UsersPagination from './UsersPagination';
import type { Invite } from '../model/openapi';
import type {
  UserResponseDto,
  PaginationDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface UsersSettingsPageProps {
  invites: Invite[];
  invitesPagination?: PaginationDto;
  invitesSearch?: string;
  invitesCurrentPage: number;
  users: UserResponseDto[];
  pagination?: PaginationDto;
  search?: string;
  currentPage: number;
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
}: UsersSettingsPageProps) {
  const total = pagination?.total ?? 0;
  const limit = pagination?.limit ?? 25;
  const totalPages = Math.ceil(total / limit);

  const invitesTotal = invitesPagination?.total ?? 0;
  const invitesLimit = invitesPagination?.limit ?? 10;
  const invitesTotalPages = Math.ceil(invitesTotal / invitesLimit);

  return (
    <SettingsLayout action={<InviteMenuButton />}>
      <div className="space-y-4">
        {(invites.length > 0 || invitesSearch || invitesTotal > 0) && (
          <InvitesSection
            invites={invites}
            totalInvites={invitesTotal}
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
          searchSlot={<UsersSearch search={search} />}
          paginationSlot={
            <UsersPagination
              currentPage={currentPage}
              totalPages={totalPages}
              search={search}
            />
          }
        />
      </div>
    </SettingsLayout>
  );
}
