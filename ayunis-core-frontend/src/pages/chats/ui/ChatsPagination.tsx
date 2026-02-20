import { SearchPagination } from '@/widgets/pagination';

interface ChatsPaginationProps {
  currentPage: number;
  totalPages: number;
  search?: string;
  agentId?: string;
}

export default function ChatsPagination({
  currentPage,
  totalPages,
  search,
  agentId,
}: Readonly<ChatsPaginationProps>) {
  return (
    <SearchPagination
      currentPage={currentPage}
      totalPages={totalPages}
      to="/chats"
      search={search}
      extraSearchParams={{ agentId }}
    />
  );
}
