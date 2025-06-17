import { TableCell, TableHead, TableRow } from "@/shared/ui/shadcn/table";
import { TableBody } from "@/shared/ui/shadcn/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/shadcn/dropdown-menu";
import { Button } from "@/shared/ui/shadcn/button";
import { MoreHorizontal, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/shadcn/card";
import { Table, TableHeader } from "@/shared/ui/shadcn/table";
import { useInviteDelete } from "../api/useInviteDelete";
import { useInvites } from "../api/useInvites";
import type { Invite } from "../model/openapi";
import { useConfirmation } from "@/widgets/confirmation-modal";
import { useTranslation } from "react-i18next";

interface InvitesSectionProps {
  invites: Invite[];
}

export default function InvitesSection({
  invites: invitesFromLoader,
}: InvitesSectionProps) {
  const { t } = useTranslation("admin-settings");
  const { invites } = useInvites({ initialData: invitesFromLoader });
  const { deleteInvite, isLoading: isDeletingInvite } = useInviteDelete();
  const { confirm } = useConfirmation();
  const pendingInvites = invites.filter(
    (invite) => invite.status === "pending",
  );
  if (pendingInvites.length === 0) {
    return null;
  }

  const handleDeleteInvite = (invite: Invite) => {
    confirm({
      title: t("confirmations.deleteInviteTitle"),
      description: t("confirmations.deleteInviteDescription", {
        email: invite.email,
      }),
      confirmText: t("confirmations.deleteText"),
      cancelText: t("confirmations.cancelText"),
      variant: "destructive",
      onConfirm: () => deleteInvite({ id: invite.id }),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("users.invites")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("users.email")}</TableHead>
              <TableHead>{t("users.role")}</TableHead>
              <TableHead>{t("users.status")}</TableHead>
              <TableHead>{t("users.sentDate")}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingInvites.map((invite) => (
              <TableRow key={invite.id}>
                <TableCell className="font-medium">{invite.email}</TableCell>
                <TableCell className="capitalize">{invite.role}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      invite.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : invite.status === "accepted"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {t(`users.${invite.status}`)}
                  </span>
                </TableCell>
                <TableCell>
                  {new Date(invite.sentDate).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDeleteInvite(invite)}
                        disabled={isDeletingInvite}
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
