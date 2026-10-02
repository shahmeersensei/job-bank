export interface FileRules {
  /** Allowed MIME types; supports wildcards like "image/*". Empty = any. */
  accept?: string[];
  maxSizeBytes?: number;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0).replace(/\.0$/, '')} ${units[unit]}`;
}

function matchesMime(type: string, pattern: string): boolean {
  if (pattern.endsWith('/*')) return type.startsWith(pattern.slice(0, -1));
  return type === pattern;
}

/** Returns a user-facing error message, or null when the file is acceptable. */
export function validateFile(
  file: Pick<File, 'type' | 'size' | 'name'>,
  rules: FileRules,
): string | null {
  if (rules.accept?.length && !rules.accept.some((pattern) => matchesMime(file.type, pattern))) {
    return `${file.name}: file type not allowed`;
  }
  if (rules.maxSizeBytes !== undefined && file.size > rules.maxSizeBytes) {
    return `${file.name}: larger than ${formatBytes(rules.maxSizeBytes)}`;
  }
  if (file.size === 0) return `${file.name}: file is empty`;
  return null;
}
