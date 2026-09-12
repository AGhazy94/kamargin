import type { CropRect, Word } from '../../types'

type OcrFixture = {
  source: { filename: string; width: number; height: number; sha256: string }
  crop?: CropRect
  priceBand?: CropRect
  locateWords: Word[]
  words: Word[]
}

export const fixtures = Object.values(
  import.meta.glob<OcrFixture>('./fixtures/*.json', {
    eager: true,
    import: 'default',
  }),
)

export function fixtureFor(time: string) {
  const fixture = fixtures.find((entry) =>
    entry.source.filename.includes(`at ${time}`),
  )
  if (!fixture) throw new Error(`Missing screenshot fixture: ${time}`)
  return fixture
}
