import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

const meta = { title: 'Components/Table', component: Table } satisfies Meta<
  typeof Table
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[32rem]">
      <Table>
        <TableCaption>Recent invoices</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[
            ['INV-001', 'Paid', '€120.00'],
            ['INV-002', 'Pending', '€85.00'],
          ].map(([invoice, status, amount]) => (
            <TableRow key={invoice}>
              <TableCell>{invoice}</TableCell>
              <TableCell>{status}</TableCell>
              <TableCell className="text-right">{amount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
};
