export interface IdGenerator {
  generate(prefix: string): string;
}

export class CryptoRandomIdGenerator implements IdGenerator {
  generate(prefix: string): string {
    return `${normalizePrefix(prefix)}_${crypto.randomUUID()}`;
  }
}

export class DeterministicIdGenerator implements IdGenerator {
  private nextValue = 1;

  constructor(private readonly seed = 1) {
    this.nextValue = seed;
  }

  generate(prefix: string): string {
    const value = `${normalizePrefix(prefix)}-${this.nextValue}`;
    this.nextValue += 1;
    return value;
  }
}

function normalizePrefix(prefix: string): string {
  const normalizedPrefix = prefix.trim();

  if (normalizedPrefix.length === 0) {
    throw new Error("Id prefix is required.");
  }

  return normalizedPrefix;
}
