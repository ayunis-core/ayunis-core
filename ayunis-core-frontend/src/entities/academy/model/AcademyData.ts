// Types
import type { Video } from "@/entities/academy/model/AcademyTypes";

export const academyVideos: Video[] = [
  {
    id: "1",
    title: "Getting Started with Ayunis Core",
    subtitle: "Learn the basics of Ayunis Core and how to set up your first project",
    duration: "15:30",
    category: "introduction" as const,
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=350&h=200&fit=crop&crop=center",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
  },
  {
    id: "2", 
    title: "Understanding the Dashboard",
    subtitle: "Complete walkthrough of the Ayunis Core dashboard and its features",
    duration: "22:45",
    category: "introduction" as const,
    thumbnail: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=350&h=200&fit=crop&crop=center",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
  },
  {
    id: "3",
    title: "Creating Your First Agent",
    subtitle: "Step-by-step guide to creating and configuring intelligent agents",
    duration: "18:20",
    category: "agents" as const,
    thumbnail: "https://images.unsplash.com/photo-1605745341112-85968b19335b?w=350&h=200&fit=crop&crop=center",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
  },
  {
    id: "4",
    title: "Advanced Agent Configuration",
    subtitle: "Learn advanced techniques for customizing agent behavior and capabilities",
    duration: "12:15",
    category: "agents" as const,
    thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=350&h=200&fit=crop&crop=center",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
  },
  {
    id: "5",
    title: "Writing Effective Prompts",
    subtitle: "Master the art of prompt engineering for better AI responses",
    duration: "25:10",
    category: "prompts" as const,
    thumbnail: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=350&h=200&fit=crop&crop=center",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
  },
  {
    id: "6",
    title: "Prompt Templates and Best Practices",
    subtitle: "Learn how to create reusable prompt templates and optimization techniques",
    duration: "19:30",
    category: "prompts" as const,
    thumbnail: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=350&h=200&fit=crop&crop=center",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
  },
  {
    id: "7",
    title: "Understanding AI Models",
    subtitle: "Overview of different AI models available in Ayunis Core",
    duration: "28:45",
    category: "models" as const,
    thumbnail: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=350&h=200&fit=crop&crop=center",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4"
  },
  {
    id: "8",
    title: "Model Selection and Optimization",
    subtitle: "How to choose the right model for your use case and optimize performance",
    duration: "14:20",
    category: "models" as const,
    thumbnail: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=350&h=200&fit=crop&crop=center",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
  }
];
