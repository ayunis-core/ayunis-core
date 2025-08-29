import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/ui/shadcn/card";
import { Badge } from "@/shared/ui/shadcn/badge";
import { FileText, Loader, X } from "lucide-react";
import { Input } from "@/shared/ui/shadcn/input";
import { Button } from "@/shared/ui/shadcn/button";
import { useRef } from "react";
import type { AgentResponseDto } from "@/shared/api";
import useAgentSources from "../api/useAgentSources";
import { useTranslation } from "react-i18next";

interface AgentKnowledgeBaseCardProps {
  agent: AgentResponseDto;
}

export default function AgentKnowledgeBaseCard({
  agent,
}: AgentKnowledgeBaseCardProps) {
  const { t } = useTranslation("agent");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    sources,
    isLoadingSources,
    addFileSource,
    addFileSourcePending,
    removeSource,
    removeSourcePending,
  } = useAgentSources({ agent });

  function handleFileRemove(sourceAssignmentId: string) {
    console.log("Removing source", sourceAssignmentId);
    removeSource(sourceAssignmentId);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      addFileSource({
        id: agent.id,
        data: { file },
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("knowledgeBase.title")}</CardTitle>
        <CardDescription>{t("knowledgeBase.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Display existing sources */}
          {isLoadingSources ? (
            <div className="text-sm text-muted-foreground">
              <Loader className="h-4 w-4 animate-spin" />
            </div>
          ) : sources.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {sources.map((source) => (
                <Badge
                  key={source.id}
                  variant="secondary"
                  className="flex items-center gap-2 px-3 py-1"
                  onClick={() => handleFileRemove(source.id)}
                >
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{source.name}</span>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" />
                </Badge>
              ))}
            </div>
          ) : null}

          {/* Add Source Button */}
          <Input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.txt,.doc,.docx,.md"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={addFileSourcePending || removeSourcePending}
          >
            {addFileSourcePending
              ? t("knowledgeBase.adding")
              : t("knowledgeBase.addSource")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
