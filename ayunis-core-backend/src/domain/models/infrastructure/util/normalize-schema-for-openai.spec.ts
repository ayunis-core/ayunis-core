import { normalizeSchemaForOpenAI } from './normalize-schema-for-openai';

describe('normalizeSchemaForOpenAI', () => {
  describe('basic cases', () => {
    it('should return undefined for undefined input', () => {
      expect(normalizeSchemaForOpenAI(undefined)).toBeUndefined();
    });

    it('should add additionalProperties: false to object type schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };

      const result = normalizeSchemaForOpenAI(schema);

      expect(result).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        additionalProperties: false,
        required: ['name'],
      });
    });

    it('should not overwrite existing additionalProperties', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        additionalProperties: true,
      };

      const result = normalizeSchemaForOpenAI(schema);

      expect(result).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        additionalProperties: true,
        required: ['name'],
      });
    });

    it('should not modify non-object type schemas', () => {
      const schema = {
        type: 'string',
      };

      const result = normalizeSchemaForOpenAI(schema);

      expect(result).toEqual({
        type: 'string',
      });
    });
  });

  describe('nested object schemas', () => {
    it('should recursively normalize nested object properties', () => {
      const schema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              address: {
                type: 'object',
                properties: {
                  city: { type: 'string' },
                },
              },
            },
          },
        },
      };

      const result = normalizeSchemaForOpenAI(schema);

      expect(result).toEqual({
        type: 'object',
        additionalProperties: false,
        required: ['user'],
        properties: {
          user: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'address'],
            properties: {
              name: { type: 'string' },
              address: {
                type: 'object',
                additionalProperties: false,
                required: ['city'],
                properties: {
                  city: { type: 'string' },
                },
              },
            },
          },
        },
      });
    });
  });

  describe('array schemas', () => {
    it('should normalize object items in arrays', () => {
      const schema = {
        type: 'object',
        properties: {
          users: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
            },
          },
        },
      };

      const result = normalizeSchemaForOpenAI(schema);

      expect(result).toEqual({
        type: 'object',
        additionalProperties: false,
        required: ['users'],
        properties: {
          users: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name'],
              properties: {
                name: { type: 'string' },
              },
            },
          },
        },
      });
    });

    it('should not modify primitive array items', () => {
      const schema = {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      };

      const result = normalizeSchemaForOpenAI(schema);

      expect(result).toEqual({
        type: 'object',
        additionalProperties: false,
        required: ['tags'],
        properties: {
          tags: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      });
    });
  });

  describe('real-world MCP tool schema', () => {
    it('should normalize a typical MCP tool schema (like search_legal_texts)', () => {
      // This simulates the schema structure that caused the original error
      const schema = {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
          filters: {
            type: 'object',
            properties: {
              dateFrom: { type: 'string' },
              dateTo: { type: 'string' },
            },
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of results',
          },
        },
        required: ['query'],
      };

      const result = normalizeSchemaForOpenAI(schema);

      expect(result).toEqual({
        type: 'object',
        additionalProperties: false,
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
          filters: {
            type: 'object',
            additionalProperties: false,
            required: ['dateFrom', 'dateTo'],
            properties: {
              dateFrom: { type: 'string' },
              dateTo: { type: 'string' },
            },
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of results',
          },
        },
        required: ['query', 'filters', 'limit'],
      });
    });
  });

  describe('format stripping', () => {
    it('should strip unsupported format values like uri', () => {
      const schema = {
        type: 'object',
        properties: {
          page_url: { type: 'string', format: 'uri', description: 'A URL' },
        },
      };

      const result = normalizeSchemaForOpenAI(schema);

      expect(result).toEqual({
        type: 'object',
        additionalProperties: false,
        required: ['page_url'],
        properties: {
          page_url: { type: 'string', description: 'A URL' },
        },
      });
    });

    it('should preserve supported format values', () => {
      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          created: { type: 'string', format: 'date-time' },
          id: { type: 'string', format: 'uuid' },
          birthday: { type: 'string', format: 'date' },
        },
      };

      const result = normalizeSchemaForOpenAI(schema);
      const props = result!.properties as Record<
        string,
        Record<string, unknown>
      >;

      expect(props.email.format).toBe('email');
      expect(props.created.format).toBe('date-time');
      expect(props.id.format).toBe('uuid');
      expect(props.birthday.format).toBe('date');
    });

    it('should strip unsupported formats from nested properties', () => {
      const schema = {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              website: { type: 'string', format: 'uri' },
            },
          },
        },
      };

      const result = normalizeSchemaForOpenAI(schema);
      const config = (
        result!.properties as Record<string, Record<string, unknown>>
      ).config;
      const nested = config.properties as Record<
        string,
        Record<string, unknown>
      >;

      expect(nested.email.format).toBe('email');
      expect(nested.website).not.toHaveProperty('format');
    });

    it('should strip unsupported formats from array item properties', () => {
      const schema = {
        type: 'object',
        properties: {
          links: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                href: { type: 'string', format: 'uri' },
              },
            },
          },
        },
      };

      const result = normalizeSchemaForOpenAI(schema);

      const links = (
        result!.properties as Record<string, Record<string, unknown>>
      ).links;
      const items = links.items as Record<string, unknown>;
      const props = items.properties as Record<string, Record<string, unknown>>;
      expect(props.href).not.toHaveProperty('format');
    });
  });

  describe('edge cases', () => {
    it('should handle schema without properties', () => {
      const schema = {
        type: 'object',
      };

      const result = normalizeSchemaForOpenAI(schema);

      expect(result).toEqual({
        type: 'object',
        additionalProperties: false,
        properties: {},
        required: [],
      });
    });

    it('should handle empty properties object', () => {
      const schema = {
        type: 'object',
        properties: {},
      };

      const result = normalizeSchemaForOpenAI(schema);

      expect(result).toEqual({
        type: 'object',
        properties: {},
        additionalProperties: false,
        required: [],
      });
    });

    it('should not mutate the original schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };

      normalizeSchemaForOpenAI(schema);

      expect(schema).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      });
      expect(schema).not.toHaveProperty('additionalProperties');
    });
  });

  describe('required array normalization', () => {
    it('should add all properties to required array when not present', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      };

      const result = normalizeSchemaForOpenAI(schema);

      expect(result).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        additionalProperties: false,
        required: ['name', 'age'],
      });
    });

    it('should replace existing partial required array with all properties', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          email: { type: 'string' },
        },
        required: ['name'], // Only name was required before
      };

      const result = normalizeSchemaForOpenAI(schema);

      expect(result).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          email: { type: 'string' },
        },
        additionalProperties: false,
        required: ['name', 'age', 'email'], // Now all are required
      });
    });

    it('should add required array to nested objects', () => {
      const schema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              firstName: { type: 'string' },
              lastName: { type: 'string' },
            },
          },
        },
      };

      const result = normalizeSchemaForOpenAI(schema);

      expect(result).toEqual({
        type: 'object',
        additionalProperties: false,
        required: ['user'],
        properties: {
          user: {
            type: 'object',
            additionalProperties: false,
            required: ['firstName', 'lastName'],
            properties: {
              firstName: { type: 'string' },
              lastName: { type: 'string' },
            },
          },
        },
      });
    });

    it('should set empty required array for object with no properties', () => {
      const schema = {
        type: 'object',
        properties: {},
      };

      const result = normalizeSchemaForOpenAI(schema);

      expect(result).toEqual({
        type: 'object',
        properties: {},
        additionalProperties: false,
        required: [],
      });
    });

    it('should add empty properties and required array for object without properties key', () => {
      const schema = {
        type: 'object',
      };

      const result = normalizeSchemaForOpenAI(schema);

      expect(result).toEqual({
        type: 'object',
        additionalProperties: false,
        properties: {},
        required: [],
      });
    });
  });
});
