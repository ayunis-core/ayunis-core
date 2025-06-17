import CreatePromptDialog from "./CreatePromptDialog";
import { useTranslation } from "node_modules/react-i18next";

export default function PromptsEmptyState() {
  const { t } = useTranslation("prompts");

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md">
      <h3 className="text-lg font-semibold mb-2">{t("emptyState.title")}</h3>
      <p className="mb-6 text-muted-foreground">
        {t("emptyState.description")}
      </p>
      <CreatePromptDialog
        buttonText={t("createDialog.buttonTextFirst")}
        showIcon={true}
      />
    </div>
  );
}
