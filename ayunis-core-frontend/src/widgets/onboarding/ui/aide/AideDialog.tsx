// Utils
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/shadcn/utils";

// UI
import { Button } from "@/shared/ui/shadcn/button";
import { X } from "lucide-react";

// Assets
import aide_assistant from "@/shared/assets/onboarding/aide_assistant.png";

interface AideDialogProps {
  open?: boolean;
  onClose?: () => void;
  onCreateClick?: () => void;
  onWatchClick?: () => void;
  className?: string;
  userEmail?: string;
  storageKeyPrefix?: string;
}

export default function AideDialog({
  open,
  onClose,
  onCreateClick,
  onWatchClick,
  className,
  userEmail,
  storageKeyPrefix = "ayunis.aide.seen",
}: AideDialogProps) {
  const { t } = useTranslation("onboarding");
  const [internalOpen, setInternalOpen] = useState(false);

  const storageKey = useMemo(
    () => `${storageKeyPrefix}:${userEmail ?? "anon"}`,
    [storageKeyPrefix, userEmail],
  );

  useEffect(() => {
    if (typeof open === "undefined") {
      try {
        const seen = localStorage.getItem(storageKey);
        if (!seen) setInternalOpen(true);
      } catch {
        setInternalOpen(true);
      }
    }
  }, [open, storageKey]);

  const isOpen = typeof open === "boolean" ? open : internalOpen;

  function markSeenAndClose() {
    localStorage.setItem(storageKey, "1");

    setInternalOpen(false);
    onClose?.();
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal={false}
      aria-label={t("aide.ariaLabel")}
      className={cn("absolute bottom-6 right-6 w-[379px] max-w-[92vw] z-49", className)}
    >
      <div className="rounded-2xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden">
        <Button
          size="icon"
          variant="outline"
          onClick={markSeenAndClose}
          aria-label={t("aide.close")}
          className="absolute top-2 right-2 z-1"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="p-5">
          <img src={aide_assistant} alt={t("aide.ariaLabel")} className="w-full h-auto" />

          <div className="mt-3">
            <h3 className="text-lg font-semibold">
              {t("aide.titlePrefix")}&nbsp;

              <span className="bg-gradient-to-r from-[#550FBB] to-[#B87FFD] bg-clip-text text-transparent">
                {t("aide.titleEmphasis")}
              </span>
            </h3>

            <p className="mt-2 text-sm">
              {t("aide.description")}
            </p>
          </div>

          <div className="mt-4 flex gap-3">
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => {
                markSeenAndClose();
                onWatchClick?.();
              }}
            >
              {t("aide.watch")}
            </Button>
            <Button
              className="flex-1"
              variant="default"
              onClick={() => {
                markSeenAndClose();
                onCreateClick?.();
              }}
            >
              {t("aide.create")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


