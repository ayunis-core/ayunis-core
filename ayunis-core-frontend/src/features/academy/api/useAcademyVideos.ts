import { academyVideos } from "@/entities/academy";
import type { Video, VideoCategoryId } from "@/entities/academy";

export function useAcademyVideos() {
  const getVideosByCategory = (categoryId: VideoCategoryId): Video[] => {
    if (categoryId === "all") {
      return academyVideos;
    }
    return academyVideos.filter(video => video.category === categoryId);
  };

  return {
    videos: academyVideos,
    getVideosByCategory,
  };
}
