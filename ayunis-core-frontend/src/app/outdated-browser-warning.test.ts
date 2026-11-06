import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const indexHtml = readFileSync('index.html', 'utf8');
const featureCheckScript =
  /<script id="outdated-browser-check">([\s\S]*?)<\/script>/.exec(
    indexHtml,
  )?.[1] ?? '';

type RequiredApi = 'findLast' | 'at' | 'structuredClone';

function renderIndex(options?: {
  language?: string;
  missingApi?: RequiredApi;
}) {
  if (!featureCheckScript) {
    throw new Error('The outdated browser feature check is missing');
  }

  document.body.innerHTML = '<div id="app"></div>';
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    value: options?.language ?? 'en-US',
  });
  const findLast = Object.getOwnPropertyDescriptor(Array.prototype, 'findLast');
  const at = Object.getOwnPropertyDescriptor(Array.prototype, 'at');
  const structuredClone = Object.getOwnPropertyDescriptor(
    window,
    'structuredClone',
  );

  try {
    Object.defineProperties(Array.prototype, {
      findLast: { configurable: true, value: () => undefined },
      at: { configurable: true, value: () => undefined },
    });
    Object.defineProperty(window, 'structuredClone', {
      configurable: true,
      value: () => undefined,
    });

    if (options?.missingApi === 'structuredClone') {
      Object.defineProperty(window, 'structuredClone', {
        configurable: true,
        value: undefined,
      });
    } else if (options?.missingApi) {
      Object.defineProperty(Array.prototype, options.missingApi, {
        configurable: true,
        value: undefined,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-implied-eval, sonarjs/code-eval -- Executes the repository-owned inline script under test.
    Function(featureCheckScript)();
  } finally {
    restoreProperty(Array.prototype, 'findLast', findLast);
    restoreProperty(Array.prototype, 'at', at);
    restoreProperty(window, 'structuredClone', structuredClone);
  }

  return document;
}

function restoreProperty(
  target: object,
  property: PropertyKey,
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) {
    Object.defineProperty(target, property, descriptor);
  } else {
    Reflect.deleteProperty(target, property);
  }
}

describe('outdated browser warning', () => {
  it('runs the feature check before the application module', () => {
    const featureCheckPosition = indexHtml.indexOf(
      'id="outdated-browser-check"',
    );
    const applicationModulePosition = indexHtml.indexOf(
      'type="module" src="/src/main.tsx"',
    );

    expect(featureCheckPosition).toBeGreaterThanOrEqual(0);
    expect(applicationModulePosition).toBeGreaterThan(featureCheckPosition);
  });

  it('does not change the page when all required APIs exist', () => {
    const renderedDocument = renderIndex();

    expect(
      renderedDocument.querySelector('#outdated-browser-warning'),
    ).toBeNull();
  });

  it.each<RequiredApi>(['findLast', 'at', 'structuredClone'])(
    'shows an English warning when %s is unavailable',
    (missingApi) => {
      const renderedDocument = renderIndex({ missingApi });
      const warning = renderedDocument.querySelector(
        '#outdated-browser-warning',
      );

      expect(warning?.textContent).toContain('Your browser is outdated.');
      expect(warning?.textContent).toContain('Please update your browser');
      expect(renderedDocument.querySelector('#app')).not.toBeNull();
    },
  );

  it('overlays the warning without taking space from the app viewport', () => {
    const renderedDocument = renderIndex({ missingApi: 'findLast' });
    const warning = renderedDocument.querySelector<HTMLElement>(
      '#outdated-browser-warning',
    );

    expect(warning).not.toBeNull();
    expect(warning?.style.position).toBe('fixed');
  });

  it('shows German copy for German browser languages and can be dismissed', () => {
    const renderedDocument = renderIndex({
      language: 'de-AT',
      missingApi: 'findLast',
    });
    const warning = renderedDocument.querySelector('#outdated-browser-warning');
    const dismissButton = renderedDocument.querySelector<HTMLButtonElement>(
      '#outdated-browser-warning-dismiss',
    );

    expect(warning?.textContent).toContain('Ihr Browser ist veraltet.');
    expect(warning?.textContent).toContain(
      'Bitte aktualisieren Sie Ihren Browser',
    );
    expect(dismissButton?.getAttribute('aria-label')).toBe('Schließen');

    dismissButton?.click();

    expect(
      renderedDocument.querySelector('#outdated-browser-warning'),
    ).toBeNull();
    expect(renderedDocument.querySelector('#app')).not.toBeNull();
  });
});
