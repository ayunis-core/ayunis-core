import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsList, TabsTrigger } from '@ayunis/ui/components/tabs';

describe('TabsList overflow', () => {
  it('keeps tab triggers at content width so long labels can scroll', () => {
    render(
      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">Eigene Wissenssammlungen</TabsTrigger>
          <TabsTrigger value="shared">Geteilte Wissenssammlungen</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    const list = screen.getByRole('tablist');
    expect(list.className).toContain('max-w-full');
    expect(list.className).toContain('overflow-x-auto');

    for (const trigger of screen.getAllByRole('tab')) {
      expect(trigger.className).toMatch(/(?:^|\s)shrink-0(?:\s|$)/);
      expect(trigger.className).not.toMatch(/(?:^|\s)flex-1(?:\s|$)/);
    }
  });
});
