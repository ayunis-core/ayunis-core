import { randomUUID } from 'crypto';
import { CSVDataSource } from './data-source.entity';
import { SourceCreator } from '../source-creator.enum';

describe('DataSource Entity', () => {
  describe('CSVDataSource', () => {
    it('should default createdBy to USER when not provided', () => {
      const dataSource = new CSVDataSource({
        name: 'Test CSV',
        data: { headers: ['col1'], rows: [['val1']] },
      });

      expect(dataSource.createdBy).toBe(SourceCreator.USER);
    });

    it('should accept createdBy as USER', () => {
      const dataSource = new CSVDataSource({
        name: 'Test CSV',
        data: { headers: ['col1'], rows: [['val1']] },
        createdBy: SourceCreator.USER,
      });

      expect(dataSource.createdBy).toBe(SourceCreator.USER);
    });

    it('should accept createdBy as LLM', () => {
      const dataSource = new CSVDataSource({
        name: 'Test CSV',
        data: { headers: ['col1'], rows: [['val1']] },
        createdBy: SourceCreator.LLM,
      });

      expect(dataSource.createdBy).toBe(SourceCreator.LLM);
    });

    it('should accept createdBy as SYSTEM', () => {
      const dataSource = new CSVDataSource({
        name: 'Test CSV',
        data: { headers: ['col1'], rows: [['val1']] },
        createdBy: SourceCreator.SYSTEM,
      });

      expect(dataSource.createdBy).toBe(SourceCreator.SYSTEM);
    });

    it('should preserve all properties when creating with full params', () => {
      const id = randomUUID();
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');
      const data = { headers: ['col1', 'col2'], rows: [['val1', 'val2']] };

      const dataSource = new CSVDataSource({
        id,
        name: 'Test CSV',
        data,
        createdBy: SourceCreator.SYSTEM,
        createdAt,
        updatedAt,
      });

      expect(dataSource.id).toBe(id);
      expect(dataSource.name).toBe('Test CSV');
      expect(dataSource.data).toEqual(data);
      expect(dataSource.createdBy).toBe(SourceCreator.SYSTEM);
      expect(dataSource.createdAt).toEqual(createdAt);
      expect(dataSource.updatedAt).toEqual(updatedAt);
    });
  });
});
