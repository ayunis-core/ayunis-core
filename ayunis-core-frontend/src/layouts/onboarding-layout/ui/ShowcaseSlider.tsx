import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/shadcn/utils';
import { useAutoRotate } from '../lib/useAutoRotate';
import { CHAT_USE_CASES, SLIDE_KEYS } from '../model/showcase-content';
import { ChatSlide } from './ChatSlide';
import { StatSlide } from './StatSlide';

const USE_CASE_BY_KEY: Partial<
  Record<string, (typeof CHAT_USE_CASES)[number]>
> = {
  report: CHAT_USE_CASES[0],
  email: CHAT_USE_CASES[1],
};

function Slide({
  active,
  children,
}: Readonly<{ active: boolean; children: ReactNode }>) {
  return (
    <div
      className={cn(
        'absolute inset-0 flex items-center justify-center transition-opacity duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none',
        active ? 'opacity-100 delay-[600ms]' : 'pointer-events-none opacity-0',
      )}
    >
      {children}
    </div>
  );
}

export function ShowcaseSlider() {
  const { index } = useAutoRotate(SLIDE_KEYS.length, 8000);

  return (
    <div className="relative flex min-h-[22rem] w-full items-center justify-center">
      {SLIDE_KEYS.map((slideKey, i) => {
        const useCase = USE_CASE_BY_KEY[slideKey];
        return (
          <Slide key={slideKey} active={index === i}>
            {useCase ? (
              <ChatSlide useCase={useCase} active={index === i} />
            ) : (
              <StatSlide active={index === i} />
            )}
          </Slide>
        );
      })}
    </div>
  );
}
