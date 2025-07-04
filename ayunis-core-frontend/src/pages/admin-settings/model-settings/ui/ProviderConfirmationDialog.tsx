import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from "@/shared/ui/shadcn/dialog";
import { Button } from "@/shared/ui/shadcn/button";
import { Checkbox } from "@/shared/ui/shadcn/checkbox";
import { Label } from "@/shared/ui/shadcn/label";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Provider } from "../model/openapi";

interface ProviderConfirmationDialogProps {
  provider: Provider;
  onConfirm: () => void;
  children: ReactNode;
}

export default function ProviderConfirmationDialog({
  provider,
  onConfirm,
  children,
}: ProviderConfirmationDialogProps) {
  const { t } = useTranslation("admin-settings");
  const [isConfirmationChecked, setIsConfirmationChecked] = useState(false);

  function handleConfirm() {
    onConfirm();
    if (!provider.isPermitted) {
      setIsConfirmationChecked(false); // Reset checkbox after use
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {provider.isPermitted
              ? `${provider.displayName} deaktivieren`
              : `${provider.displayName} freischalten`}
          </DialogTitle>
        </DialogHeader>
        <p>
          {provider.isPermitted
            ? `Wenn Sie diesen Provider deaktivieren, können Benutzer nicht mehr auf dessen Modelle zugreifen.`
            : `Wenn Sie diesen Provider freischalten, können alle Benutzer diesen Provider verwenden und auf dessen Modelle zugreifen.`}
        </p>
        {!provider.isPermitted && (
          <p>
            <span className="flex items-center gap-2">
              <Checkbox
                id="confirm"
                checked={isConfirmationChecked}
                onCheckedChange={(checked) =>
                  setIsConfirmationChecked(checked === true)
                }
              />
              <Label htmlFor="confirm">
                <span>
                  Ich akzeptiere die zusätzlichen{" "}
                  <a
                    href="https://ayunis.com/core/terms"
                    target="_blank"
                    className="underline"
                  >
                    Nutzungsbedingungen
                  </a>{" "}
                  und die{" "}
                  <a
                    href="https://ayunis.com/core/privacy"
                    target="_blank"
                    className="underline"
                  >
                    Datenschutzerklärung
                  </a>
                  .
                </span>
              </Label>
            </span>
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="submit"
              onClick={handleConfirm}
              disabled={!provider.isPermitted && !isConfirmationChecked}
            >
              {provider.isPermitted
                ? t("models.disableProvider")
                : t("models.enableProvider")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
