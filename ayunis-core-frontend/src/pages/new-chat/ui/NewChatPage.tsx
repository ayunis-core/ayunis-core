import NewChatPageLayout from "./NewChatPageLayout";
import ChatInput from "@/widgets/chat-input";
import { useInitiateChat } from "../api/useInitiateChat";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import ContentAreaHeader from "@/widgets/content-area-header/ui/ContentAreaHeader";
import { showError } from "@/shared/lib/toast";
import { generateUUID } from "@/shared/lib/uuid";
import type { AgentResponseDto } from "@/shared/api";
import { SourceResponseDtoType } from "@/shared/api/generated/ayunisCoreAPI.schemas";
import TrialLimitBanner from "@/widgets/subscription/ui/TrialLimitBanner";
import { useSubscriptionStatus } from "@/entities/subscription/lib/useSubscriptionStatus";
import { cn } from "@/shared/lib/shadcn/utils";

interface NewChatPageProps {
  prefilledPrompt?: string;
  selectedModelId?: string;
  selectedAgentId?: string;
  agents: AgentResponseDto[];
  isEmbeddingModelEnabled: boolean;
}

export default function NewChatPage({
  selectedModelId,
  selectedAgentId,
  prefilledPrompt,
  isEmbeddingModelEnabled,
  agents,
}: NewChatPageProps) {
  const { t } = useTranslation("chats");
  const { initiateChat } = useInitiateChat();
  const { data: subscriptionStatus, isLoading: isLoadingSubscription } = useSubscriptionStatus();
  const [modelId, setModelId] = useState(selectedModelId);
  const [agentId, setAgentId] = useState(selectedAgentId);
  const [sources, setSources] = useState<
    Array<{
      id: string;
      name: string;
      type: SourceResponseDtoType;
      file: File;
    }>
  >([]);
  const [shouldAnimateBanner, setShouldAnimateBanner] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedAgent = agents.find((agent) => agent.id === agentId);

  const isLimitReached = subscriptionStatus?.isMessageLimitReached ?? false;

  // Show banner with fade-in animation when limit is reached and data is loaded
  useEffect(() => {
    if (!isLoadingSubscription) {
      if (isLimitReached) {
        // Small delay to ensure smooth transition
        const timer = setTimeout(() => {
          setShowBanner(true);
        }, 50);
        return () => clearTimeout(timer);
      } else {
        setShowBanner(false);
      }
    }
  }, [isLimitReached, isLoadingSubscription]);

  function handleFileUpload(file: File) {
    const isCsvFile = file.name.endsWith(".csv");
    setSources([
      ...sources,
      {
        id: generateUUID(),
        name: file.name,
        type: isCsvFile
          ? SourceResponseDtoType.data
          : SourceResponseDtoType.text,
        file,
      },
    ]);
  }

  function handleRemoveSource(sourceId: string) {
    setSources(sources.filter((source) => source.id !== sourceId));
  }

  function handleModelChange(modelId: string) {
    setModelId(modelId);
    setAgentId(undefined);
  }

  function handleAgentChange(agentId: string) {
    setAgentId(agentId);
    setModelId(undefined);
  }

  function handleAgentRemove() {
    setAgentId(undefined);
    setModelId(selectedModelId);
  }

  async function handleSend(message: string) {
    if (!modelId && !agentId) {
      showError(t("newChat.noModelOrAgentError"));
      return;
    }

    // If limit is reached, prevent sending and animate banner
    if (isLimitReached) {
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }

      setShouldAnimateBanner(true);
      bannerTimeoutRef.current = setTimeout(() => {
        setShouldAnimateBanner(false);
      }, 500);
      return;
    }

    initiateChat(message, modelId, agentId, sources);
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }
    };
  }, []);

  return (
    <NewChatPageLayout
      positionTrialMessageBanner={isLimitReached}
      header={<ContentAreaHeader title={t("newChat.newChat")} />}
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t("newChat.title")}</h1>
      </div>
      <div className="w-full flex flex-col gap-4 mt-2">
        <ChatInput
          // If an agent is selected, use the agent's model,
          // but disable the model selection
          // to only show the model that the agent uses
          modelId={agentId ? selectedAgent?.model.id : modelId}
          isModelChangeDisabled={!!agentId}
          agentId={agentId}
          sources={sources}
          onModelChange={handleModelChange}
          onAgentChange={handleAgentChange}
          onAgentRemove={handleAgentRemove}
          onSend={handleSend}
          onSendCancelled={() => null}
          prefilledPrompt={prefilledPrompt}
          onFileUpload={handleFileUpload}
          onRemoveSource={handleRemoveSource}
          onDownloadSource={() => null}
          isEmbeddingModelEnabled={isEmbeddingModelEnabled}
        />
      </div>

      <div
        className={cn(
          "transition-all duration-500 ease-out",
          showBanner
            ? "opacity-100 translate-y-0 max-h-[500px]"
            : "opacity-0 -translate-y-4 max-h-0 overflow-hidden"
        )}
      >
        {showBanner && (
          <TrialLimitBanner
            animate={shouldAnimateBanner}
          />
        )}
      </div>
    </NewChatPageLayout>
  );
}
