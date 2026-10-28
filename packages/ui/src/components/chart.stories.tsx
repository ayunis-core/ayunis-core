import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from './chart';

const data = [
  { month: 'Jan', requests: 186 },
  { month: 'Feb', requests: 305 },
  { month: 'Mar', requests: 237 },
];
const config = {
  requests: { label: 'Requests', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const meta = {
  title: 'Components/Chart',
  component: ChartContainer,
  args: { config, children: <BarChart /> },
} satisfies Meta<typeof ChartContainer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const BarChartExample: Story = {
  render: () => (
    <ChartContainer config={config} className="h-72 w-[32rem]">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="requests" fill="var(--color-requests)" radius={4} />
      </BarChart>
    </ChartContainer>
  ),
};
