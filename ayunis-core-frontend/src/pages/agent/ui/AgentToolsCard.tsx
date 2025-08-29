import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/ui/shadcn/card";
import { Badge } from "@/shared/ui/shadcn/badge";
import { useTranslation } from "react-i18next";

export default function AgentToolsCard() {
  const { t } = useTranslation("agent");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tools.title")}</CardTitle>
        <CardDescription>{t("tools.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Badge variant="secondary">{t("tools.comingSoon")}</Badge>
      </CardContent>
    </Card>
  );
}
