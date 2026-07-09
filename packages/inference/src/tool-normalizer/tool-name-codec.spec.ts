import { describe, expect, it } from 'vitest';

import { ToolNameCodec } from './tool-name-codec';

const tool = (name: string) => ({ name, description: 'd', parameters: {} });

describe('ToolNameCodec', () => {
  it('passes provider-safe names through verbatim', () => {
    const codec = new ToolNameCodec([tool('search_documents')]);
    expect(codec.encode('search_documents')).toBe('search_documents');
    expect(codec.decode('search_documents')).toBe('search_documents');
  });

  it('sanitizes unsafe characters and round-trips back to the original', () => {
    const codec = new ToolNameCodec([tool('notion.search')]);
    expect(codec.encode('notion.search')).toBe('notion_search');
    expect(codec.decode('notion_search')).toBe('notion.search');
  });

  it('suffixes a stable hash when a sanitized name collides with a verbatim one', () => {
    const codec = new ToolNameCodec([
      tool('code_execution'),
      tool('code.execution'),
    ]);
    expect(codec.encode('code_execution')).toBe('code_execution');
    const wire = codec.encode('code.execution');
    expect(wire).toMatch(/^code_execution_[a-z0-9]{6}$/);
    expect(codec.decode(wire)).toBe('code.execution');
  });

  it('suffixes both when two transformed names share a sanitized base', () => {
    const codec = new ToolNameCodec([tool('a.b'), tool('a:b')]);
    const first = codec.encode('a.b');
    const second = codec.encode('a:b');
    expect(first).not.toBe(second);
    expect(first).toMatch(/^a_b_[a-z0-9]{6}$/);
    expect(second).toMatch(/^a_b_[a-z0-9]{6}$/);
    expect(codec.decode(first)).toBe('a.b');
    expect(codec.decode(second)).toBe('a:b');
  });

  it('is deterministic regardless of tool order', () => {
    const toolsA = [
      tool('code_execution'),
      tool('code.execution'),
      tool('a.b'),
    ];
    const toolsB = [...toolsA].reverse();
    const a = new ToolNameCodec(toolsA);
    const b = new ToolNameCodec(toolsB);
    for (const t of toolsA) {
      expect(a.encode(t.name)).toBe(b.encode(t.name));
    }
  });

  it('keeps wire names within 64 characters, suffix included', () => {
    const long = 'x'.repeat(80) + '.' + 'y'.repeat(10);
    const codec = new ToolNameCodec([tool(long)]);
    const wire = codec.encode(long);
    expect(wire.length).toBeLessThanOrEqual(64);
    expect(codec.decode(wire)).toBe(long);
  });

  it('falls back to a hashed placeholder for names without safe characters', () => {
    const codec = new ToolNameCodec([tool('äöü')]);
    const wire = codec.encode('äöü');
    expect(wire).toMatch(/^[a-zA-Z0-9_-]{1,64}$/);
    expect(codec.decode(wire)).toBe('äöü');
  });

  it('extends the suffix when a generated wire name is already taken', () => {
    // Learn the suffix 'code.execution' gets, then declare a safe tool with
    // exactly that literal name — the transformed tool must move aside.
    const probe = new ToolNameCodec([
      tool('code_execution'),
      tool('code.execution'),
    ]);
    const occupied = probe.encode('code.execution');

    const codec = new ToolNameCodec([
      tool('code_execution'),
      tool('code.execution'),
      tool(occupied),
    ]);
    expect(codec.encode(occupied)).toBe(occupied);
    const moved = codec.encode('code.execution');
    expect(moved).not.toBe(occupied);
    expect(moved).not.toBe('code_execution');
    expect(codec.decode(moved)).toBe('code.execution');
  });

  it('guarantees unique wire names for adversarial tool sets', () => {
    const originals = [
      'code_execution',
      'code.execution',
      'code:execution',
      'code execution',
      'a.b',
      'a:b',
      'a_b',
    ];
    const codec = new ToolNameCodec(originals.map(tool));
    const wires = originals.map((name) => codec.encode(name));
    expect(new Set(wires).size).toBe(originals.length);
    for (let i = 0; i < originals.length; i++) {
      expect(codec.decode(wires[i])).toBe(originals[i]);
    }
  });

  it('keeps a departed tool off a declared wire name (no conflation)', () => {
    // 'foo.bar' was detached; 'foo_bar' is a live tool. The departed tool's
    // history must not be attributed to the live one.
    const codec = new ToolNameCodec([tool('foo_bar')]);
    const wire = codec.encode('foo.bar');
    expect(wire).not.toBe('foo_bar');
    expect(wire).toMatch(/^foo_bar_[a-z0-9]{6}$/);
  });

  it('passes legacy sanitized history names through unchanged', () => {
    // Pre-codec rows stored sanitized names; they must keep matching their
    // tool's current wire form instead of being suffixed away.
    const codec = new ToolNameCodec([tool('notion.search')]);
    expect(codec.encode('notion_search')).toBe('notion_search');
  });

  it('passes safe unknown names through both directions', () => {
    const codec = new ToolNameCodec([tool('known')]);
    expect(codec.encode('not_in_map')).toBe('not_in_map');
    expect(codec.decode('not_in_map')).toBe('not_in_map');
  });

  it('sanitizes unknown unsafe names on the way out (departed tools in history)', () => {
    const codec = new ToolNameCodec([tool('known')]);
    // A tool detached mid-conversation is absent from the map, but its
    // historical calls must still reach the wire under a safe name.
    expect(codec.encode('departed.tool')).toBe('departed_tool');
  });

  it('collapses duplicate declared names into a single mapping', () => {
    const codec = new ToolNameCodec([
      tool('notion.search'),
      tool('notion.search'),
    ]);
    const wire = codec.encode('notion.search');
    expect(wire).toBe('notion_search');
    expect(codec.decode(wire)).toBe('notion.search');
  });

  it('gives a departed tool the same wire name it had while declared', () => {
    // 'foo.bar' collided with 'foo_bar' last turn and got a suffix; after it
    // detaches, its history must still encode to that same suffixed name.
    const declared = new ToolNameCodec([tool('foo_bar'), tool('foo.bar')]);
    const liveWire = declared.encode('foo.bar');

    const afterDetach = new ToolNameCodec([tool('foo_bar')]);
    expect(afterDetach.encode('foo.bar')).toBe(liveWire);
  });

  it('keeps probing when a departed tool suffixed name is also taken', () => {
    // Learn the suffix 'foo.bar' would get, then declare tools occupying both
    // the base and that suffixed name — the departed tool must land elsewhere.
    const probe = new ToolNameCodec([tool('foo_bar'), tool('foo.bar')]);
    const occupied = probe.encode('foo.bar');

    const codec = new ToolNameCodec([tool('foo_bar'), tool(occupied)]);
    const wire = codec.encode('foo.bar');
    expect(wire).not.toBe('foo_bar');
    expect(wire).not.toBe(occupied);
    expect(wire).toMatch(/^foo_bar_[a-z0-9]{6}$/);
  });
});
