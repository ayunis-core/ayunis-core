// Types
import type { Video } from "@/entities/academy/model/AcademyTypes";

// API
import { useVideoCategories } from "@/entities/academy/api/useVideoCategories";

// UI
import { Card, CardContent } from "@/shared/ui/shadcn/card";

// Icons
import { Play } from "lucide-react";

interface AcademyCardProps {
  video: Video;
  onClick: (video: Video) => void;
}

export function AcademyCard({ video, onClick }: AcademyCardProps) {
  const { getLocalizedCategory } = useVideoCategories();

  return (
    <Card className="group cursor-pointer p-0 border-none gap-3" onClick={() => onClick(video)}>
      <div className="relative rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden transform group-hover:scale-105">
        <img
          src={video.thumbnail || "fallback-image"}
          alt={video.title}
          className="w-full h-48 object-cover"
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white bg-opacity-90 rounded-full p-3 shadow-lg group-hover:bg-opacity-100 transition-all duration-300">
            <Play className="w-6 h-6 text-gray-800 fill-gray-800" />
          </div>
        </div>

        <div className="absolute bottom-3 right-3 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded-md">
          {video.duration}
        </div>
      </div>

      <CardContent className="p-0">
        <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{video.title}</h3>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{video.duration}</span>
          <span>•</span>
          <span className="capitalize">{getLocalizedCategory(video.category)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
