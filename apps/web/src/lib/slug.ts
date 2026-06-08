/**
 * Generates a URL-safe slug from a clinic name.
 * - Converts to lowercase
 * - Strips Devanagari and other non-ASCII characters
 * - Replaces spaces and underscores with hyphens
 * - Removes any characters that are not alphanumeric or hyphens
 * - Collapses consecutive hyphens
 * - Trims leading/trailing hyphens
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    // Remove Devanagari and non-Latin script characters
    .replace(/[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0C00-\u0C7F]/g, '')
    // Normalize unicode (decompose accented characters)
    .normalize('NFD')
    // Remove combining diacritical marks
    .replace(/[\u0300-\u036f]/g, '')
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove anything that's not alphanumeric or hyphen
    .replace(/[^a-z0-9-]/g, '')
    // Collapse multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Trim leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
}

/**
 * Generates a slug suggestion by appending a numeric suffix.
 * e.g. "abc-clinic" → "abc-clinic-2"
 */
export function suggestSlug(base: string, suffix: number): string {
  return `${base}-${suffix}`
}
