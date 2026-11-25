import type { WelcomeGradient } from '@/pages/welcome-prototype/model/welcome-prototype';
import './product-backdrop.css';

export function ProductBackdrop({
  gradient,
}: Readonly<{ gradient: WelcomeGradient }>) {
  if (gradient === 'product') {
    return (
      <div className="wp-product-backdrop" aria-hidden>
        <div className="wp-product-backdrop__canvas">
          <div className="wp-product-backdrop__blobs">
            <div className="wp-product-backdrop__blob is-1" />
            <div className="wp-product-backdrop__blob is-2" />
            <div className="wp-product-backdrop__blob is-3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wp-glow wp-glow--mist" aria-hidden>
      <div className="wp-glow__blob is-1" />
      <div className="wp-glow__blob is-2" />
      <div className="wp-glow__blob is-3" />
    </div>
  );
}
