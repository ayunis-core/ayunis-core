import { Link, useNavigate } from '@tanstack/react-router';
import { ChatHistoryPagination } from '@ayunis/chat/history';

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
  const navigate = useNavigate();
  return (
    <ChatHistoryPagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPage={(page) => {
        void navigate({ to: '/chats', search: { search, page } });
      }}
      renderControl={(control) => (
        <Link
          to="/chats"
          search={{ search, page: control.page }}
          disabled={control.disabled}
          aria-current={control.current ? 'page' : undefined}
          aria-label={control.label}
          data-testid={control.testId}
          className={control.className}
        >
          {control.children}
        </Link>
      )}
    />
  );
}
