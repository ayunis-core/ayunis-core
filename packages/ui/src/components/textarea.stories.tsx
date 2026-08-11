import type { Meta, StoryObj } from '@storybook/react-vite';

import { Textarea } from './textarea';

const meta = {
  title: 'Components/Textarea',
  component: Textarea,
  args: { placeholder: 'Write a message', className: 'w-80' },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithContent: Story = {
  args: { defaultValue: 'A longer, editable message.' },
};
