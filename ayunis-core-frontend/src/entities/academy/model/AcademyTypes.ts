export interface Video {
  id: string;
  title: string;
  subtitle?: string;
  duration: string;
  category: VideoCategoryId;
  thumbnail?: string;
  videoUrl: string;
}

export type VideoCategoryId = "introduction" | "agents" | "prompts" | "models" | "all";

export interface VideoCategory {
  id: VideoCategoryId;
  text: string;
}
