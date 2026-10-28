import type { Meta, StoryObj } from '@storybook/react-vite';

import { Calendar } from './calendar';

const meta = {
  title: 'Components/Calendar',
  component: Calendar,
} satisfies Meta<typeof Calendar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SingleDate: Story = {
  args: {
    mode: 'single',
    defaultMonth: new Date(2026, 2),
    selected: new Date(2026, 2, 18),
    className: 'rounded-md border',
  },
};
