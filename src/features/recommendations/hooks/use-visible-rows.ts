import { useEffect, useState } from 'react'

// 4610 rows at once costs ~5 s of layout; a page fills the panel in one frame.
export const ROW_PAGE_SIZE = 60

export function useVisibleRows<T>(rows: readonly T[]) {
  const [count, setCount] = useState(ROW_PAGE_SIZE)
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null)
  const [ranked, setRanked] = useState(rows)

  // A new ranking is a new list: it starts from the first page again.
  if (ranked !== rows) {
    setRanked(rows)
    setCount(ROW_PAGE_SIZE)
  }

  useEffect(() => {
    if (!sentinel) return

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setCount((current) => current + ROW_PAGE_SIZE)
      }
    })
    observer.observe(sentinel)

    return () => observer.disconnect()
  }, [sentinel])

  return {
    visible: rows.slice(0, count),
    hasMore: count < rows.length,
    sentinelRef: setSentinel,
  }
}
