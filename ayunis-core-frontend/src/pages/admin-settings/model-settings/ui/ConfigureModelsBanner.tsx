// Utils
import { useTranslation } from "react-i18next";

// UI
import { Button } from "@/shared/ui/shadcn/button";

// Icons
import { ArrowRight, GalleryHorizontalEnd } from "lucide-react";

// Static
import welcome_bg from "@/shared/assets/onboarding/welcome_bg.jpg";

export default function ConfigureModelsBanner() {
  const { t } = useTranslation("admin-settings-models");

  function onWatchClick() {
    // TODO: Add redirect to video tutorial after academy is merged
  }

  return (
    <div
      className="rounded-2xl px-6 py-5 text-white shadow-sm mb-6"
      style={{
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundImage: `url(${welcome_bg})`,
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold">
            <GalleryHorizontalEnd className="h-5 w-5" />
            <span>{t("models.configureBanner.title")}</span>
          </div>

          <p className="text-sm text-white mt-1">{t("models.configureBanner.subtitle")}</p>
        </div>

        <Button variant="outline" className="bg-white text-black" onClick={onWatchClick}>
          {t("models.configureBanner.cta")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}


