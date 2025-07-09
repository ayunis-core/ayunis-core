import NewChatPageLayout from "./NewChatPageLayout";
import ChatInput from "@/widgets/chat-input";
import { useInitiateChat } from "../api/useInitiateChat";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ContentAreaHeader from "@/widgets/content-area-header/ui/ContentAreaHeader";
import { showError } from "@/shared/lib/toast";

interface NewChatPageProps {
  prefilledPrompt?: string;
  selectedModelId?: string;
  selectedAgentId?: string;
  hasSubscription: boolean;
}

export default function NewChatPage({
  selectedModelId,
  selectedAgentId,
  prefilledPrompt,
  hasSubscription,
}: NewChatPageProps) {
  const { t } = useTranslation("chats");
  const { initiateChat } = useInitiateChat();
  const [modelId, setModelId] = useState(selectedModelId);
  const [agentId, setAgentId] = useState(selectedAgentId);

  function handleModelChange(modelId: string) {
    setModelId(modelId);
    setAgentId(undefined);
  }
  function handleAgentChange(agentId: string) {
    setAgentId(agentId);
    setModelId(undefined);
  }

  function handleSend(message: string) {
    if (!modelId && !agentId) {
      showError(t("newChat.noModelOrAgentError"));
      return;
    }
    if (!hasSubscription) {
      showError(t("newChat.upgradeToProError"));
      return;
    }
    initiateChat(message, modelId, agentId);
  }

  return (
    <NewChatPageLayout header={<ContentAreaHeader title="New Chat" />}>
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t("newChat.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("newChat.description")}
        </p>
      </div>
      <div className="w-full flex flex-col gap-4">
        <ChatInput
          modelOrAgentId={modelId ?? agentId}
          onModelChange={handleModelChange}
          onAgentChange={handleAgentChange}
          onSend={handleSend}
          prefilledPrompt={prefilledPrompt}
        />
      </div>
    </NewChatPageLayout>
  );
}
