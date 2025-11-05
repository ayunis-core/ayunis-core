// Types
import type { UserUsageDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";

// Utils
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";

// UI
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/shadcn/table";
import { Avatar, AvatarFallback } from "@/shared/ui/shadcn/avatar";
import { Badge } from "@/shared/ui/shadcn/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui/shadcn/pagination";

// Lib
import { getInitials } from "@/shared/lib/getInitials";
import { formatCompactNumber } from "@/shared/lib/formatCompactNumber";

interface UserUsageTableContentProps {
  users: UserUsageDto[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function UserUsageTableContent({
  users,
  currentPage,
  totalPages,
  onPageChange,
}: UserUsageTableContentProps) {
  const { t, i18n } = useTranslation("admin-settings-usage");

  const formatCompact = (value?: number) => {
    if (value === undefined) {
      return "-";
    }
    return formatCompactNumber(value, i18n.language);
  };


  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">{t("userUsage.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("userUsage.subtitle")}
          </p>
        </div>
      </div>

      <Table className="mt-6">
        <TableHeader>
          <TableRow className="border-border/40">
            <TableHead>{t("userUsage.user")}</TableHead>
            <TableHead>{t("userUsage.tokens")}</TableHead>
            <TableHead>{t("userUsage.requests")}</TableHead>
            <TableHead className="w-[150px]">{t("userUsage.models")}</TableHead>
            <TableHead>{t("userUsage.lastActive")}</TableHead>
            <TableHead>{t("userUsage.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length > 0 ? (
            users.map((user) => (
              <TableRow key={user.userId} className="border-border/20 transition hover:bg-muted/20">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{getInitials(user.userName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{user.userName}</div>
                      <div className="text-sm text-muted-foreground">{user.userEmail}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{formatCompact(user.tokens)}</div>
                  <div className="text-xs text-muted-foreground">{t("userUsage.tokens")}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{formatCompact(user.requests)}</div>
                  <div className="text-xs text-muted-foreground">{t("userUsage.requests")}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.modelBreakdown?.slice(0, 3).map((model) => (
                      <Badge key={model.modelId} variant="outline" className="text-xs">
                        {model.displayName}
                      </Badge>
                    ))}
                    {user.modelBreakdown && user.modelBreakdown.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{user.modelBreakdown.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {user.lastActivity ? (
                    <span className="text-sm">
                      {/* TODO: Fix typing issue on the dto level */}
                      {formatDistanceToNow(new Date(user.lastActivity as unknown as string), { addSuffix: true })}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? t("userUsage.active") : t("userUsage.inactive")}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No users match the selected filters on this page. Try adjusting your filters or navigate to another page.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      <div className="flex justify-center mt-6">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 0) onPageChange(currentPage - 1);
                }}
                className={currentPage === 0 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            <PaginationItem>
              <div className="text-sm text-muted-foreground px-2">
                {Math.max(totalPages ?? 0, 1)}
              </div>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages - 1) onPageChange(currentPage + 1);
                }}
                className={currentPage >= totalPages - 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}

