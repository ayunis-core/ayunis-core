import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  staticDirs: [
    {
      from: '../../../ayunis-core-frontend/src/shared/assets/brand',
      to: '/brand',
    },
    {
      from: '../../../ayunis-core-frontend/public/favicon',
      to: '/favicon',
    },
  ],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  managerHead: (head) =>
    `${head}<link rel="icon" href="/favicon/favicon.svg" />`,
  viteFinal(viteConfig) {
    viteConfig.plugins ??= [];
    viteConfig.plugins.push(tailwindcss());
    return viteConfig;
  },
};

export default config;
