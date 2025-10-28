// Types
import type { ModelProviderWithPermittedStatusResponseDto } from "@/shared/api";
import type { ReactNode } from "react";

// Utils
import { useState } from "react";
import { useTranslation, Trans } from "react-i18next";

// Ui
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

interface ProviderConfirmationDialogProps {
  provider: ModelProviderWithPermittedStatusResponseDto;
  onConfirm: () => void;
  children?: ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function ProviderConfirmationDialog({
  provider,
  onConfirm,
  children,
  isOpen,
  onOpenChange,
}: ProviderConfirmationDialogProps) {
  const { t } = useTranslation("admin-settings-models");
  const [isConfirmationChecked, setIsConfirmationChecked] = useState(false);

  function handleConfirm() {
    onConfirm();
    if (!provider.isPermitted) {
      setIsConfirmationChecked(false); // Reset checkbox after use
    }
    onOpenChange?.(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {provider.isPermitted
              ? t("models.providerConfirmation.disableProvider", {
                  provider: provider.displayName,
                })
              : t("models.providerConfirmation.enableProvider", {
                  provider: provider.displayName,
                })}
          </DialogTitle>
        </DialogHeader>
        <p>
          {provider.isPermitted
            ? t("models.providerConfirmation.disableProviderDescription")
            : t("models.providerConfirmation.enableProviderDescription")}
        </p>
        {provider.provider === "mistral" && (
          <p className="text-sm text-destructive-foreground mb-4">
            {t("models.providerConfirmation.mistralProviderHint")}
          </p>
        )}
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
                  <Trans
                    i18nKey="models.providerConfirmation.acceptTermsAndPrivacy"
                    ns="admin-settings-models"
                    components={{
                      termsLink: (
                        <a
                          href="https://www.ayunis.com/besondere-nutzungsbedingungen"
                          target="_blank"
                          className="underline"
                        />
                      ),
                    }}
                  />
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
