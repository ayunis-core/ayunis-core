import { useState, type FormEvent } from "react";
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

export default function CreateOrgDialog() {
  const { t } = useTranslation("super-admin-settings-orgs");
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const resetForm = () => {
    setName("");
    setSlug("");
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: Replace with create organization mutation once available
    handleClose();
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-slug">{t("dialog.slugLabel")}</Label>
            <Input
              id="org-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder={t("dialog.slugPlaceholder") ?? ""}
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              title={t("dialog.slugDescription") ?? ""}
              required
            />
            <p className="text-xs text-muted-foreground">
              {t("dialog.slugDescription")}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("dialog.cancel")}
            </Button>
            <Button type="submit">{t("dialog.create")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
