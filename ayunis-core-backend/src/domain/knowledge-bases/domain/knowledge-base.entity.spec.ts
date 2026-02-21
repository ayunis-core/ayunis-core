import { randomUUID } from 'crypto';
import { KnowledgeBase } from './knowledge-base.entity';

describe('KnowledgeBase Entity', () => {
  const orgId = randomUUID();
  const userId = randomUUID();

  it('should generate a UUID when id is not provided', () => {
    const kb = new KnowledgeBase({
      name: 'Stadtrecht Gemeinde Musterstadt',
      orgId,
      userId,
    });

    expect(kb.id).toBeDefined();
    expect(kb.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('should use the provided id when given', () => {
    const id = randomUUID();
    const kb = new KnowledgeBase({
      id,
      name: 'Bauordnung',
      orgId,
      userId,
    });

    expect(kb.id).toBe(id);
  });

  it('should default description to empty string when not provided', () => {
    const kb = new KnowledgeBase({
      name: 'Verwaltungsvorschriften',
      orgId,
      userId,
    });

    expect(kb.description).toBe('');
  });

  it('should use the provided description when given', () => {
    const kb = new KnowledgeBase({
      name: 'Haushaltsplan 2025',
      description: 'Alle Dokumente zum kommunalen Haushaltsplan',
      orgId,
      userId,
    });

    expect(kb.description).toBe('Alle Dokumente zum kommunalen Haushaltsplan');
  });

  it('should default createdAt and updatedAt to current date', () => {
    const before = new Date();
    const kb = new KnowledgeBase({
      name: 'Protokolle Gemeinderat',
      orgId,
      userId,
    });
    const after = new Date();

    expect(kb.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(kb.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(kb.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(kb.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should preserve all properties when creating with full params', () => {
    const id = randomUUID();
    const createdAt = new Date('2025-06-01');
    const updatedAt = new Date('2025-06-15');

    const kb = new KnowledgeBase({
      id,
      name: 'Bebauungspläne',
      description: 'Sammlung aller B-Pläne der Gemeinde',
      orgId,
      userId,
      createdAt,
      updatedAt,
    });

    expect(kb.id).toBe(id);
    expect(kb.name).toBe('Bebauungspläne');
    expect(kb.description).toBe('Sammlung aller B-Pläne der Gemeinde');
    expect(kb.orgId).toBe(orgId);
    expect(kb.userId).toBe(userId);
    expect(kb.createdAt).toEqual(createdAt);
    expect(kb.updatedAt).toEqual(updatedAt);
  });
});
