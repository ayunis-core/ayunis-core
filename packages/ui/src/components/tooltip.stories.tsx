import type { Meta, StoryObj } from '@storybook/react-vite';
import { SettingsIcon } from 'lucide-react';

import { Button } from './button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

const meta = { title: 'Components/Tooltip', component: Tooltip } satisfies Meta<
  typeof Tooltip
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="outline" aria-label="Settings">
            <SettingsIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Settings</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};
