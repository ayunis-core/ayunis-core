import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/shared/ui/shadcn/card";
import { Button } from "@/shared/ui/shadcn/button";
import { Edit, MessageCircle, Trash2 } from "lucide-react";
import EditPromptDialog from "./EditPromptDialog";
import { useDeletePrompt } from "../api/useDeletePrompt";
import { useConfirmation } from "@/widgets/confirmation-modal";
import { useTranslation } from "react-i18next";
import type { Prompt } from "../model/openapi";
import { Link } from "@tanstack/react-router";

interface PromptCardProps {
  prompt: Prompt;
}

export default function PromptCard({ prompt }: PromptCardProps) {
  const { t } = useTranslation("prompts");
  const deletePrompt = useDeletePrompt();
  const { confirm } = useConfirmation();

  function handleDelete() {
    confirm({
      title: t("card.confirmDelete.title"),
      description: t("card.confirmDelete.description", { title: prompt.title }),
      confirmText: t("card.confirmDelete.confirmText"),
      cancelText: t("card.confirmDelete.cancelText"),
      variant: "destructive",
      onConfirm: () => {
        deletePrompt.mutate({ id: prompt.id });
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg mb-1">{prompt.title}</CardTitle>
            <CardDescription className="line-clamp-2">
              {prompt.content}
            </CardDescription>
          </div>
        </div>
        <CardAction>
          <div className="flex items-center gap-2">
            <Link to="/chat" search={{ prompt: prompt.id }}>
              <Button variant="ghost">
                <MessageCircle className="h-4 w-4" /> Start Chat
              </Button>
            </Link>
            <EditPromptDialog
              selectedPrompt={prompt}
              trigger={
                <Button variant="ghost" size="icon">
                  <Edit className="h-4 w-4" />
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={deletePrompt.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
