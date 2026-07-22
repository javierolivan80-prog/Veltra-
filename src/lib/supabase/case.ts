function camelToSnake(key: string): string {
  return key.replace(/([A-Z])/g, "_$1").toLowerCase();
}

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Shallow key transform — every table row here is a flat object (arrays are stored as JSON columns, not nested objects). */
export function toSnakeCase<T extends object>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) out[camelToSnake(key)] = value;
  return out;
}

export function toCamelCase<T = Record<string, unknown>>(obj: object): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) out[snakeToCamel(key)] = value;
  return out as T;
}
