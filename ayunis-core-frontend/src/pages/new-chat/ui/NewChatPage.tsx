import NewChatPageLayout from "./NewChatPageLayout";
import ChatInput from "@/widgets/chat-input";
import { useInitiateChat } from "../api/useInitiateChat";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PermittedModel } from "../model/openapi";

interface NewChatPageProps {
  defaultModel: PermittedModel;
  prefilledPrompt?: string;
}

export default function NewChatPage({
  defaultModel,
  prefilledPrompt,
}: NewChatPageProps) {
  const { t } = useTranslation("chats");
  const { initiateChat } = useInitiateChat();
  const [model, setModel] = useState<PermittedModel>(defaultModel);
  const [internetSearch, setInternetSearch] = useState(false);
  const [codeExecution, setCodeExecution] = useState(false);

  const handleSend = (message: string) => {
    initiateChat(message, model.id);
  };

  return (
    <NewChatPageLayout>
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t("newChat.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("newChat.description")}
        </p>
      </div>
      <div className="w-full flex flex-col gap-4">
        <ChatInput
          model={model}
          onModelChange={(model) => setModel(model)}
          internetSearch={internetSearch}
          onInternetSearchChange={setInternetSearch}
          codeExecution={codeExecution}
          onCodeExecutionChange={setCodeExecution}
          onSend={handleSend}
          prefilledPrompt={prefilledPrompt}
        />
      </div>
    </NewChatPageLayout>
  );
}
