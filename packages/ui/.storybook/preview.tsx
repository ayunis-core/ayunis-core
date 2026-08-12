import type { Preview } from '@storybook/react-vite';

import './storybook.css';

const preview: Preview = {
  decorators: [
    (Story) => (
      <div className="theme-core bg-background text-foreground min-h-screen p-6">
        <Story />
      </div>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default preview;
