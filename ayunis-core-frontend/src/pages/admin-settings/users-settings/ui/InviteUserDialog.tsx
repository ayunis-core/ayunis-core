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
import { useTranslation } from "react-i18next";

interface InviteFormData {
  email: string;
  role: InviteRole;
}

export default function InviteUserDialog() {
  const { t } = useTranslation("admin-settings-users");
  const [isOpen, setIsOpen] = useState(false);

  const { createInvite, isLoading: isCreatingInvite } = useInviteCreate();

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
    </>
  );
}
