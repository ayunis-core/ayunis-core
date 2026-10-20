import { useRef } from 'react';
import type { CourseModuleResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { toLoomEmbedUrl } from '@/pages/academy-chapter/lib/toLoomEmbedUrl';
import { useModulePageTimeHeartbeat } from '@/pages/academy-chapter/api/useModulePageTimeHeartbeat';

interface ModuleVideoProps {
  courseModule: CourseModuleResponseDto;
}

export function ModuleVideo({ courseModule }: Readonly<ModuleVideoProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  useModulePageTimeHeartbeat(courseModule.id, containerRef);

  return (
    <div
      ref={containerRef}
      className="aspect-video overflow-hidden rounded-lg border bg-muted"
    >
      <iframe
        key={courseModule.id}
        src={toLoomEmbedUrl(courseModule.loomUrl)}
        title={courseModule.title}
        className="h-full w-full"
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture"
      />
    </div>
  );
}
