import type { Meta, StoryObj } from '@storybook/react-vite';

import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

const meta = { title: 'Components/Tabs', component: Tabs } satisfies Meta<
  typeof Tabs
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-96">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Manage account details.</TabsContent>
      <TabsContent value="security">Manage security settings.</TabsContent>
    </Tabs>
  ),
};
