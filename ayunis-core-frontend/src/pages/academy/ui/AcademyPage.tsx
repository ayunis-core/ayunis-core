import { useTranslation } from "react-i18next";
import { VideoAcademy } from "@/features/academy";
import AppLayout from "@/layouts/app-layout";
import ContentAreaLayout from "@/layouts/content-area-layout/ui/ContentAreaLayout";
import ContentAreaHeader from "@/widgets/content-area-header/ui/ContentAreaHeader";

export function AcademyPage() {
  const { t } = useTranslation("academy");
  
  const contentHeader = (
    <ContentAreaHeader title={t("title")} />
  );

  return (
    <AppLayout>
      <ContentAreaLayout 
        contentHeader={contentHeader}
        contentArea={<VideoAcademy />}
        contentWidth="lg"
      />
    </AppLayout>
  );
}
