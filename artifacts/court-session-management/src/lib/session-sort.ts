export type SortOption = 'nearest' | 'furthest' | 'newest';

/**
 * Sorts sessions by nearest time remaining / hearing date.
 * - Upcoming/Today sessions come first, sorted ascending by hearing date (nearest time first).
 * - Finished/past sessions come next, sorted descending by hearing date (most recently finished first).
 * - Sessions without hearing date come last, sorted descending by ID.
 */
export function sortSessions<T extends { hearingAt?: string | null; id?: number }>(
  sessions: T[],
  sortBy: SortOption = 'nearest'
): T[] {
  const now = Date.now();

  return [...sessions].sort((a, b) => {
    const timeA = a.hearingAt ? new Date(a.hearingAt).getTime() : null;
    const timeB = b.hearingAt ? new Date(b.hearingAt).getTime() : null;

    const validA = timeA !== null && !isNaN(timeA);
    const validB = timeB !== null && !isNaN(timeB);

    if (sortBy === 'newest') {
      return (b.id ?? 0) - (a.id ?? 0);
    }

    if (sortBy === 'furthest') {
      if (validA && validB) {
        return timeB! - timeA!;
      }
      if (validA && !validB) return -1;
      if (!validA && validB) return 1;
      return (b.id ?? 0) - (a.id ?? 0);
    }

    // Default 'nearest'
    if (validA && validB) {
      const isPastA = timeA! < now;
      const isPastB = timeB! < now;

      // 1. Upcoming before Past
      if (!isPastA && isPastB) return -1;
      if (isPastA && !isPastB) return 1;

      // 2. Both upcoming: nearest time (earliest timestamp) first
      if (!isPastA && !isPastB) {
        return timeA! - timeB!;
      }

      // 3. Both past: most recently ended session (latest timestamp) first
      if (isPastA && isPastB) {
        return timeB! - timeA!;
      }
    }

    // Sessions with valid timestamps come before those without
    if (validA && !validB) return -1;
    if (!validA && validB) return 1;

    // Fallback: higher ID (newer) first
    return (b.id ?? 0) - (a.id ?? 0);
  });
}
