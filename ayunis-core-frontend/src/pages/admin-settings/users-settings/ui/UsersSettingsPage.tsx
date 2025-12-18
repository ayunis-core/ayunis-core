import SettingsLayout from '../../admin-settings-layout';
import InviteUserDialog from './InviteUserDialog';
import InvitesSection from './InvitesSection';
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
  users: UserResponseDto[];
  pagination?: PaginationDto;
  search?: string;
  currentPage: number;
}

export default function UsersSettingsPage({
  invites,
  users,
  pagination,
  search,
  currentPage,
}: UsersSettingsPageProps) {
  const total = pagination?.total ?? 0;
  const limit = pagination?.limit ?? 25;
  const totalPages = Math.ceil(total / limit);

  return (
    <SettingsLayout action={<InviteUserDialog />}>
      <div className="space-y-4">
        {invites.length > 0 && <InvitesSection invites={invites} />}
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
