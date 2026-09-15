/** One scan never enqueues more than this, however many files the folder gained. */
export const WATCH_SCAN_LIMIT = 10

const IMAGE_NAME = /\.(?:png|jpe?g|webp|avif|gif|bmp)$/i

/** The high-water mark, plus the names already taken *at* it, which a bare timestamp cannot separate. */
export type SeenMark = { at: number; names: string[] }

export type WatchCandidate = { name: string; lastModified: number }

export type Selection<T> = { ingest: T[]; skipped: number; next: SeenMark }

export function isScreenshotName(name: string) {
  return IMAGE_NAME.test(name)
}

export function markFrom(at: number): SeenMark {
  return { at, names: [] }
}

export function selectNew<T extends WatchCandidate>(
  candidates: readonly T[],
  seen: SeenMark,
  limit: number = WATCH_SCAN_LIMIT,
): Selection<T> {
  const fresh = candidates
    .filter(
      (candidate) =>
        isScreenshotName(candidate.name) &&
        (candidate.lastModified > seen.at ||
          (candidate.lastModified === seen.at &&
            !seen.names.includes(candidate.name))),
    )
    .sort(
      (a, b) =>
        a.lastModified - b.lastModified ||
        (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
    )

  // Keeping the newest and dropping the older ones is what bounds a folder picked up mid-life.
  const ingest = fresh.slice(Math.max(0, fresh.length - limit))
  if (!ingest.length) return { ingest, skipped: 0, next: seen }

  const at = ingest[ingest.length - 1].lastModified
  return {
    ingest,
    skipped: fresh.length - ingest.length,
    next: {
      at,
      names: ingest
        .filter((candidate) => candidate.lastModified === at)
        .map((candidate) => candidate.name),
    },
  }
}
