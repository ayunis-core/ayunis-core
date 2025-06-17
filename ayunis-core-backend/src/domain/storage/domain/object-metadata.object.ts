export class ObjectMetadata {
  readonly contentType?: string;
  readonly originalName?: string;
  private readonly metadata: Map<string, string>;

  constructor(metadata: Record<string, string | undefined> = {}) {
    this.metadata = new Map();

    // Extract special properties
    if (metadata.contentType) {
      this.contentType = metadata.contentType;
    }

    if (metadata.originalName) {
      this.originalName = metadata.originalName;
    }

    // Store all properties in the map
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined) {
        this.metadata.set(key, value);
      }
    }
  }

  get(key: string): string | undefined {
    return this.metadata.get(key);
  }

  has(key: string): boolean {
    return this.metadata.has(key);
  }

  entries(): [string, string][] {
    return Array.from(this.metadata.entries());
  }

  toRawMetadata(): Record<string, string> {
    const result: Record<string, string> = {};

    // Add content type with standard header name
    if (this.contentType) {
      result['Content-Type'] = this.contentType;
    }

    // Add all other metadata
    for (const [key, value] of this.metadata.entries()) {
      if (key !== 'contentType') {
        result[key] = value;
      }
    }

    return result;
  }

  static fromRawMetadata(raw?: Record<string, string>): ObjectMetadata {
    if (!raw) {
      return new ObjectMetadata();
    }

    const metadata: Record<string, string> = {};

    for (const [key, value] of Object.entries(raw)) {
      if (key.toLowerCase() === 'content-type') {
        metadata.contentType = value;
      } else {
        metadata[key] = value;
      }
    }

    return new ObjectMetadata(metadata);
  }
}
