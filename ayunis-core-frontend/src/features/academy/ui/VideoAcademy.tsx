// Types
import type { Video, VideoCategoryId } from "@/entities/academy";

// Utils
import { useState } from "react";
import { useTranslation } from "react-i18next";

// Entities
import { AcademyCard, AcademyDialog, useVideoCategories } from "@/entities/academy";

// API
import { useAcademyVideos } from "../api/useAcademyVideos";

export function VideoAcademy() {
  const { t } = useTranslation("academy");
  const { getVideosByCategory } = useAcademyVideos();
  const { categories } = useVideoCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<VideoCategoryId>("all");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredVideos = getVideosByCategory(selectedCategoryId);

  const handleVideoClick = (video: Video) => {
    setSelectedVideo(video);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedVideo(null);
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        {/* Header Image */}
        <div className="flex justify-center mb-8">
          <div className="w-full max-w-4xl h-32 relative">
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=120&fit=crop&crop=center"
              alt="Video Academy Header"
              className="w-full h-full rounded-xl shadow-lg object-cover"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex justify-center mb-8">
          <nav className="flex space-x-8">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`pb-2 text-lg font-medium transition-colors duration-200 relative ${
                  selectedCategoryId === category.id
                    ? "text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {category.text}
                {selectedCategoryId === category.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredVideos.map((video) => (
            <AcademyCard
              key={video.id}
              video={video}
              onClick={handleVideoClick}
            />
          ))}
        </div>

        {/* Video Modal */}
        <AcademyDialog
          video={selectedVideo}
          isOpen={isModalOpen}
          onClose={closeModal}
        />
      </div>
    </div>
  );
}
