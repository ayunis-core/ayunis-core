import {
  Card,
  CardContent,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/shadcn/dropdown-menu";
import { Button } from "@/shared/ui/shadcn/button";
import { MoreHorizontal, Edit, Trash2, UserCheck } from "lucide-react";
import { useUserRoleUpdate } from "../api/useUserRoleUpdate";
import { useUserDelete } from "../api/useUserDelete";
import { useUsers } from "../api/useUsers";
import { useState } from "react";
import type { User } from "../model/openapi";
import type { UserResponseDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";
import { useConfirmation } from "@/widgets/confirmation-modal";
import { useTranslation } from "node_modules/react-i18next";

interface UsersSectionProps {
  users: User[];
}

export default function UsersSection({
  users: usersFromLoader,
}: UsersSectionProps) {
  const { t } = useTranslation("admin-settings");
  const { users } = useUsers({ initialData: usersFromLoader });
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const { updateUserRole, isLoading: isUpdatingRole } = useUserRoleUpdate({
    onSuccessCallback: () => setLoadingUserId(null),
  });
  const { deleteUser, isLoading: isDeletingUser } = useUserDelete({
    onSuccessCallback: () => setLoadingUserId(null),
  });
  const { confirm } = useConfirmation();

  const handleRoleToggle = (user: User) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    confirm({
      title: t("confirmations.changeUserRoleTitle"),
      description: t("confirmations.changeUserRoleDescription", {
        name: user.name,
        role: newRole === "admin" ? t("users.admin") : t("users.user"),
      }),
      confirmText: t("confirmations.changeRoleText"),
      cancelText: t("confirmations.cancelText"),
      variant: "default",
      onConfirm: () => {
        setLoadingUserId(user.id);
        updateUserRole({
          id: user.id,
          role: newRole,
        });
      },
    });
  };

  const handleDeleteUser = (user: UserResponseDto) => {
    confirm({
      title: t("confirmations.deleteUserTitle"),
      description: t("confirmations.deleteUserDescription", {
        name: user.name,
      }),
      confirmText: t("confirmations.deleteText"),
      cancelText: t("confirmations.cancelText"),
      variant: "destructive",
      onConfirm: () => {
        setLoadingUserId(user.id);
        deleteUser(user.id);
      },
    });
  };

  const isUserLoading = (userId: string) => {
    return loadingUserId === userId && (isUpdatingRole || isDeletingUser);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("users.users")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("users.name")}</TableHead>
              <TableHead>{t("users.email")}</TableHead>
              <TableHead>{t("users.role")}</TableHead>
              <TableHead>{t("users.status")}</TableHead>
              <TableHead>{t("users.joinDate")}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="capitalize">{user.role}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {t("users.active")}
                  </span>
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        disabled={isUserLoading(user.id)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem disabled>
                        <Edit className="mr-2 h-4 w-4" />
                        {t("users.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleRoleToggle(user)}
                        disabled={isUserLoading(user.id)}
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        {t("users.changeRole", {
                          role:
                            user.role === "admin"
                              ? t("users.user")
                              : t("users.admin"),
                        })}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDeleteUser(user)}
                        disabled={isUserLoading(user.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("users.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
