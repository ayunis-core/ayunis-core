// Types
import type { VideoCategory, VideoCategoryId } from "@/entities/academy/model/AcademyTypes";

// Utils
import { useTranslation } from "react-i18next";

export function useVideoCategories() {
  const { t } = useTranslation("academy");
  
  const categories: VideoCategory[] = [
    { id: "all", text: t("categories.all") },
    { id: "introduction", text: t("categories.introduction") },
    { id: "agents", text: t("categories.agents") },
    { id: "prompts", text: t("categories.prompts") },
    { id: "models", text: t("categories.models") },
  ];
  
  const getCategoryById = (id: VideoCategoryId): VideoCategory | undefined => {
    return categories.find(category => category.id === id);
  };

  const getLocalizedCategory = (categoryId: VideoCategoryId): string => {
    const category = getCategoryById(categoryId);
    return category ? category.text : categoryId;
  };
  
  return {
    categories,
    getCategoryById,
    getLocalizedCategory,
  };
}
