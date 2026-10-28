import type { Meta, StoryObj } from '@storybook/react-vite';

import { Input } from './input';

const meta = {
  title: 'Components/Input',
  component: Input,
  args: { placeholder: 'Enter a value' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Disabled value' },
};
export const Invalid: Story = {
  args: { 'aria-invalid': true, defaultValue: 'Invalid value' },
};
