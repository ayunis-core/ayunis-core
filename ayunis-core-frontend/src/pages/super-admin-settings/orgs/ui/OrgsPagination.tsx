import type {
  SuperAdminOrgsControllerGetAllOrgsStatus,
  SuperAdminOrgsControllerGetAllOrgsSubscription,
} from '@/shared/api';
import { SearchPagination } from '@/widgets/pagination';

interface OrgsPaginationProps {
  currentPage: number;
  totalPages: number;
  search?: string;
  status: SuperAdminOrgsControllerGetAllOrgsStatus;
  subscription: SuperAdminOrgsControllerGetAllOrgsSubscription;
}

export default function OrgsPagination({
  currentPage,
  totalPages,
  search,
  status,
  subscription,
}: Readonly<OrgsPaginationProps>) {
  return (
    <SearchPagination
      currentPage={currentPage}
      totalPages={totalPages}
      to="/super-admin-settings/orgs"
      search={search}
      extraSearchParams={{ orgStatus: status, orgSubscription: subscription }}
    />
  );
}
