// Utils
import { useState, useEffect } from "react";

// Entities
import { useUserUsage } from "@/entities/usage";

// UI
import { UserUsageTableLoading } from "./UserUsageTableLoading";
import { UserUsageTableError } from "./UserUsageTableError";
import { UserUsageTableEmpty } from "./UserUsageTableEmpty";
import { UserUsageTableContent } from "./UserUsageTableContent";

interface UserUsageTableProps {
  startDate?: Date;
  endDate?: Date;
}

const DEFAULT_PAGE_SIZE = 10;

export function UserUsageTable({ startDate, endDate }: UserUsageTableProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = DEFAULT_PAGE_SIZE;
  const offset = currentPage * pageSize;

  const { data: userUsageResponse, isLoading, error } = useUserUsage({
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    limit: pageSize,
    offset: offset,
    includeModelBreakdown: true,
  });

  const users = userUsageResponse?.data ?? [];
  const total = userUsageResponse?.pagination?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [startDate, endDate]);

  if (isLoading) {
    return <UserUsageTableLoading />;
  }

  if (error) {
    return <UserUsageTableError error={error} />;
  }

  if (total === 0) {
    return <UserUsageTableEmpty />;
  }

  return (
    <UserUsageTableContent
      users={users}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={setCurrentPage}
    />
  );
}

