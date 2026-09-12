import { useState } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getJobs } from '@/lib/game-data'
import type { RecommendationFilters } from '../types'
import { LEVEL_RANGE } from '../utils/rank'

const ALL_JOBS = 'all'

function clampLevel(raw: string, fallback: number): number {
  const value = Number(raw)
  if (raw === '' || !Number.isFinite(value) || value === 0) return fallback
  return Math.min(LEVEL_RANGE.max, Math.max(LEVEL_RANGE.min, value))
}

/** Clamping mid-keystroke rewrites what is being typed, so the range is only bound on commit. */
function LevelInput({
  id,
  label,
  value,
  fallback,
  onCommit,
}: {
  id: string
  label: string
  value: number
  fallback: number
  onCommit: (level: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  const [committed, setCommitted] = useState(value)

  if (committed !== value) {
    setCommitted(value)
    setDraft(String(value))
  }

  function commit() {
    const level = clampLevel(draft, fallback)
    setCommitted(level)
    setDraft(String(level))
    onCommit(level)
  }

  return (
    <Input
      id={id}
      inputMode="numeric"
      aria-label={label}
      className="h-10 text-right tabular-nums"
      value={draft}
      onChange={(event) => setDraft(event.target.value.replace(/[^\d]/g, ''))}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit()
      }}
    />
  )
}

export function FilterRow({
  filters,
  onChange,
}: {
  filters: RecommendationFilters
  onChange: (patch: Partial<RecommendationFilters>) => void
}) {
  const jobOptions = [
    { value: ALL_JOBS, label: 'All professions' },
    ...getJobs().map((job) => ({ value: String(job.id), label: job.name })),
  ]

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1 basis-full sm:basis-56">
        <Label className="mb-1.5 text-muted-foreground text-xs">
          Profession
        </Label>
        <Select
          items={jobOptions}
          value={filters.jobId === null ? ALL_JOBS : String(filters.jobId)}
          onValueChange={(value) => {
            if (value === null) return
            onChange({
              jobId: value === ALL_JOBS ? null : Number(value),
            })
          }}
        >
          <SelectTrigger
            aria-label="Filter by profession"
            className="h-10 w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {jobOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-end gap-2">
        <div className="w-20">
          <Label
            htmlFor="craft-level-min"
            className="mb-1.5 text-muted-foreground text-xs"
          >
            Level
          </Label>
          <LevelInput
            id="craft-level-min"
            label="Minimum craft level"
            value={filters.minLevel}
            fallback={LEVEL_RANGE.min}
            onCommit={(minLevel) =>
              onChange({
                minLevel,
                maxLevel: Math.max(minLevel, filters.maxLevel),
              })
            }
          />
        </div>
        <span className="pb-2.5 text-muted-foreground text-sm">to</span>
        <div className="w-20">
          <Label htmlFor="craft-level-max" className="sr-only">
            Maximum craft level
          </Label>
          <LevelInput
            id="craft-level-max"
            label="Maximum craft level"
            value={filters.maxLevel}
            fallback={LEVEL_RANGE.max}
            onCommit={(maxLevel) =>
              onChange({
                maxLevel,
                minLevel: Math.min(maxLevel, filters.minLevel),
              })
            }
          />
        </div>
      </div>

      <label className="flex h-10 cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={filters.hideIncomplete}
          onChange={(event) =>
            onChange({ hideIncomplete: event.target.checked })
          }
        />
        Hide incomplete
      </label>
    </div>
  )
}
