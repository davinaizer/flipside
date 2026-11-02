/** Lower-case and strip accents so "quimica" matches "Química" (L6). */
export function foldText(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** True when every word of the query appears in the text; a blank query matches everything. */
export function matchesQuery(text: string, query: string): boolean {
  const haystack = foldText(text);
  return foldText(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}
