import { CITY_LOGOS } from '../model/showcase-content';

export function LogoMarquee() {
  const items = [...CITY_LOGOS, ...CITY_LOGOS];

  return (
    <div className="group relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <div className="flex w-max animate-onboarding-marquee items-center gap-12 group-hover:[animation-play-state:paused]">
        {items.map((logo, index) => (
          <img
            key={`${logo.name}-${index}`}
            src={logo.src}
            alt={logo.name}
            className="h-16 w-auto shrink-0 opacity-95"
          />
        ))}
      </div>
    </div>
  );
}
