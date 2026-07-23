const NON_ALPHANUMERIC_REGEX = /[^a-z0-9]+/g;
const MULTI_SPACE_REGEX = /\s+/g;
const COMBINING_MARKS_REGEX = /[\u0300-\u036f]/g;

export function normalizeForSearch(input: string): string {
  if (!input) {
    return "";
  }

  return input
    .normalize("NFKD")
    .replace(COMBINING_MARKS_REGEX, "")
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_REGEX, " ")
    .replace(MULTI_SPACE_REGEX, " ")
    .trim();
}

export function compactForSearch(input: string): string {
  return normalizeForSearch(input).replace(/\s+/g, "");
}

export function splitSearchTokens(input: string): string[] {
  const normalized = normalizeForSearch(input);
  if (!normalized) {
    return [];
  }

  return normalized.split(" ").filter(Boolean);
}
