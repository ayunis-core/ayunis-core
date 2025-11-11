import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/shadcn/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/shadcn/table";
import { Button } from "@/shared/ui/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/shadcn/dropdown-menu";
import { Trash2, MoreHorizontal, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { UserResponseDto } from "@/shared/api";
import { formatDate } from "@/shared/lib/format-date";
import { useSuperAdminDeleteUser } from "../api/useSuperAdminDeleteUser";
import { useSuperAdminTriggerPasswordReset } from "../api/useSuperAdminTriggerPasswordReset";
import { useConfirmation } from "@/widgets/confirmation-modal";
import CreateUserDialog from "./CreateUserDialog";

interface UsersTableProps {
  users: UserResponseDto[];
  orgId: string;
}

export default function UsersTable({ users, orgId }: UsersTableProps) {
  const { t } = useTranslation("super-admin-settings-org");
  const { deleteUser, isLoading: isDeleting } = useSuperAdminDeleteUser({
    orgId,
  });
  const { triggerPasswordReset, isLoading: isTriggeringReset } =
    useSuperAdminTriggerPasswordReset();
  const { confirm } = useConfirmation();

  const handleDeleteUser = (user: UserResponseDto) => {
    confirm({
      title: t("confirmDelete.title"),
      description: t("confirmDelete.description", {
        name: user.name,
      }),
      confirmText: t("confirmDelete.confirmText"),
      cancelText: t("confirmDelete.cancelText"),
      variant: "destructive",
      onConfirm: () => {
        deleteUser(user.id);
      },
    });
  };

  const handleTriggerPasswordReset = (user: UserResponseDto) => {
    confirm({
      title: t("confirmPasswordReset.title"),
      description: t("confirmPasswordReset.description", {
        name: user.name,
        email: user.email,
      }),
      confirmText: t("confirmPasswordReset.confirmText"),
      cancelText: t("confirmPasswordReset.cancelText"),
      variant: "default",
      onConfirm: () => {
        triggerPasswordReset(user.id);
      },
    });
  };

  const isLoading = isDeleting || isTriggeringReset;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("header.title")}</CardTitle>
            <CardDescription>{t("header.description")}</CardDescription>
          </div>
          <CreateUserDialog orgId={orgId} />
        </div>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-2 py-10 text-center">
            <h3 className="text-lg font-semibold">{t("empty.title")}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t("empty.description")}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.name")}</TableHead>
                <TableHead>{t("table.createdAt")}</TableHead>
                <TableHead className="w-[100px]">
                  {t("table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="w-[100px]">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          disabled={isLoading}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleTriggerPasswordReset(user)}
                          disabled={isLoading}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          {t("table.sendPasswordReset")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteUser(user)}
                          disabled={isLoading}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("table.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
