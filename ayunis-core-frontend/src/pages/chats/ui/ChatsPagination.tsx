import { SearchPagination } from '@/widgets/pagination';

interface ChatsPaginationProps {
  currentPage: number;
  totalPages: number;
  search?: string;
}

export default function ChatsPagination({
  currentPage,
  totalPages,
  search,
}: Readonly<ChatsPaginationProps>) {
  return (
    <SearchPagination
      currentPage={currentPage}
      totalPages={totalPages}
      to="/chats"
      search={search}
    />
  );
}
