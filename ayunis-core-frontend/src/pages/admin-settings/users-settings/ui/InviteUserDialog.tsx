import { Button } from "@/shared/ui/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/shadcn/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/shadcn/form";
import { Input } from "@/shared/ui/shadcn/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/shadcn/select";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { InviteRole } from "../model/openapi";
import { useInviteCreate } from "../api/useInviteCreate";
import { Copy, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

interface InviteFormData {
  email: string;
  role: InviteRole;
}

export default function InviteUserDialog() {
  const { t } = useTranslation("admin-settings");
  const [isOpen, setIsOpen] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [inviteToken, setInviteToken] = useState("");
  const [copied, setCopied] = useState(false);

  const { createInvite, isLoading: isCreatingInvite } = useInviteCreate({
    onSuccessCallback: (token) => {
      setInviteToken(token);
      setShowTokenModal(true);
    },
  });

  // Construct the full invite URL
  const inviteUrl = inviteToken
    ? `${window.location.origin}/invites/${inviteToken}/accept`
    : "";

  const form = useForm<InviteFormData>({
    defaultValues: {
      email: "",
      role: undefined,
    },
  });

  function onSubmit(data: InviteFormData) {
    createInvite(data);
    setIsOpen(false);
    form.reset();
  }

  function handleCancel() {
    setIsOpen(false);
    form.reset();
  }

  async function handleCopyToken() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy invite URL:", err);
    }
  }

  function handleCloseTokenModal() {
    setShowTokenModal(false);
    setInviteToken("");
    setCopied(false);
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button size="sm">{t("inviteDialog.inviteUser")}</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("inviteDialog.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("inviteDialog.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                rules={{
                  required: t("inviteDialog.emailRequired"),
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: t("inviteDialog.emailInvalid"),
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inviteDialog.emailAddress")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("inviteDialog.emailPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                rules={{
                  required: t("inviteDialog.roleRequired"),
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inviteDialog.roleLabel")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t(
                              "inviteDialog.roleSelectPlaceholder",
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">
                          {t("inviteDialog.roleUser")}
                        </SelectItem>
                        <SelectItem value="admin">
                          {t("inviteDialog.roleAdmin")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isCreatingInvite}
                >
                  {t("inviteDialog.cancel")}
                </Button>
                <Button type="submit" disabled={isCreatingInvite}>
                  {isCreatingInvite
                    ? t("inviteDialog.sending")
                    : t("inviteDialog.sendInvitation")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Invite Token Modal */}
      <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {t("inviteDialog.invitationCreatedTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("inviteDialog.invitationCreatedDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {t("inviteDialog.inviteToken")}
              </label>
              <div className="flex items-center space-x-2 mt-1">
                <Input
                  value={inviteUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToken}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {copied
                  ? t("inviteDialog.copiedToClipboard")
                  : t("inviteDialog.clickToCopy")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCloseTokenModal}>
              {t("inviteDialog.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
