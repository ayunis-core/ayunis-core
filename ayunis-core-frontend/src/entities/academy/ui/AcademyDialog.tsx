// Types
import type { Video } from "@/entities/academy/model/AcademyTypes";

// Utils
import { useTranslation } from "react-i18next";

// UI
import {
  Dialog,
  DialogContent,
} from "@/shared/ui/shadcn/dialog";

// API
import { useVideoCategories } from "@/entities/academy/api/useVideoCategories";

interface AcademyDialogProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AcademyDialog({ video, isOpen, onClose }: AcademyDialogProps) {
  const { t } = useTranslation("academy");
  const { getLocalizedCategory } = useVideoCategories();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0">
        <div className="relative">
          {video && (
            <div>
              <video 
                src={video.videoUrl} 
                controls 
                autoPlay 
                className="w-full aspect-video rounded-t-lg" 
              />
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-2">{video.title}</h2>
                <p className="text-gray-600 mb-4">{video.subtitle}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{t("duration")}: {video.duration}</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {getLocalizedCategory(video.category)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
