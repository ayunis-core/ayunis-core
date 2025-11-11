import { useState, useCallback, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
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
import { Input } from "@/shared/ui/shadcn/input";
import { Label } from "@/shared/ui/shadcn/label";
import { useSuperAdminCreateOrg } from "../api/useSuperAdminCreateOrg";

export default function CreateOrgDialog() {
  const { t } = useTranslation("super-admin-settings-orgs");
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");

  const resetForm = useCallback(() => {
    setName("");
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    resetForm();
  }, [resetForm]);

  const { createOrg, isLoading } = useSuperAdminCreateOrg({
    onSuccessCallback: handleClose,
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }
    createOrg({ name: name.trim() });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{t("actions.createOrg")}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("dialog.title")}</DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="org-name">{t("dialog.nameLabel")}</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("dialog.namePlaceholder") ?? ""}
              required
              disabled={isLoading}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              {t("dialog.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? (t("dialog.creating") ?? "Creating...")
                : t("dialog.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
