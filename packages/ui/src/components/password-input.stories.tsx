import type { Meta, StoryObj } from '@storybook/react-vite';

import { PasswordInput } from './password-input';

const meta = {
  title: 'Components/PasswordInput',
  component: PasswordInput,
  args: { placeholder: 'Enter password', className: 'w-72' },
} satisfies Meta<typeof PasswordInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = { args: { defaultValue: 'secret-password' } };
