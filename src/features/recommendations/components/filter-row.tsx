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
  const value = Number(raw.replace(/[^\d]/g, ''))
  if (!Number.isFinite(value) || value === 0) return fallback
  return Math.min(LEVEL_RANGE.max, Math.max(LEVEL_RANGE.min, value))
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
          <Input
            id="craft-level-min"
            inputMode="numeric"
            aria-label="Minimum craft level"
            className="h-10 text-right tabular-nums"
            value={filters.minLevel}
            onChange={(event) => {
              const minLevel = clampLevel(event.target.value, LEVEL_RANGE.min)
              onChange({
                minLevel,
                maxLevel: Math.max(minLevel, filters.maxLevel),
              })
            }}
          />
        </div>
        <span className="pb-2.5 text-muted-foreground text-sm">to</span>
        <div className="w-20">
          <Label htmlFor="craft-level-max" className="sr-only">
            Maximum craft level
          </Label>
          <Input
            id="craft-level-max"
            inputMode="numeric"
            aria-label="Maximum craft level"
            className="h-10 text-right tabular-nums"
            value={filters.maxLevel}
            onChange={(event) => {
              const maxLevel = clampLevel(event.target.value, LEVEL_RANGE.max)
              onChange({
                maxLevel,
                minLevel: Math.min(maxLevel, filters.minLevel),
              })
            }}
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
