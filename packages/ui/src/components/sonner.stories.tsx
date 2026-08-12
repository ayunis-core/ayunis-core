import type { Meta, StoryObj } from '@storybook/react-vite';
import { toast } from 'sonner';

import { Button } from './button';
import { Toaster } from './sonner';

const meta = { title: 'Components/Sonner', component: Toaster } satisfies Meta<
  typeof Toaster
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <>
      <Toaster />
      <Button onClick={() => toast.success('Changes saved')}>Show toast</Button>
    </>
  ),
};
