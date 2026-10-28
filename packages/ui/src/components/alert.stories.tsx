import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlertTriangleIcon, InfoIcon } from 'lucide-react';

import { Button } from './button';
import { Alert, AlertAction, AlertDescription, AlertTitle } from './alert';

const meta = { title: 'Components/Alert', component: Alert } satisfies Meta<
  typeof Alert
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Alert className="w-96">
      <InfoIcon />
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>Your changes have been saved.</AlertDescription>
      <AlertAction>
        <Button size="sm" variant="outline">
          Undo
        </Button>
      </AlertAction>
    </Alert>
  ),
};
export const Warning: Story = {
  render: () => (
    <Alert variant="warning" className="w-96">
      <AlertTriangleIcon />
      <AlertTitle>Check your settings</AlertTitle>
      <AlertDescription>Some options still need attention.</AlertDescription>
    </Alert>
  ),
};
