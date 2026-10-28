import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './accordion';

const meta = {
  title: 'Components/Accordion',
  component: Accordion,
  args: { type: 'single' },
} satisfies Meta<typeof Accordion>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-96">
      <AccordionItem value="one">
        <AccordionTrigger>What is Ayunis?</AccordionTrigger>
        <AccordionContent>
          Ayunis provides AI tools for public administration.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="two">
        <AccordionTrigger>Is it configurable?</AccordionTrigger>
        <AccordionContent>
          Yes, administrators can configure assistants and providers.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
