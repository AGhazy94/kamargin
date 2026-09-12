import type { LucideIcon } from 'lucide-react'
import {
  CalculatorIcon,
  CameraIcon,
  SparklesIcon,
  StarIcon,
  WifiOffIcon,
} from 'lucide-react'
import { Link } from 'react-router'

import { Card, CardContent } from '@/components/ui/card'
import { GAME_DATA_VERSION } from '@/lib/game-data'

type Destination = {
  to: string
  icon: LucideIcon
  label: string
  description: string
}

function Screen({ to, icon: Icon, label, description }: Destination) {
  return (
    <Card className="transition-colors hover:bg-accent">
      <CardContent>
        <Link
          to={to}
          className="flex flex-col gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex items-center gap-2 font-heading font-medium">
            <Icon className="size-4 shrink-0 text-primary" />
            {label}
          </span>
          <span className="text-muted-foreground text-sm">{description}</span>
        </Link>
      </CardContent>
    </Card>
  )
}

function Step({ number, children }: { number: number; children: string }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-xs tabular-nums">
        {number}
      </span>
      <span className="text-muted-foreground text-sm">{children}</span>
    </li>
  )
}

export function LandingRoute({
  destinations,
}: {
  destinations: Record<
    'calculator' | 'crafts' | 'watchlist' | 'snapshots',
    string
  >
}) {
  return (
    <section
      className="flex max-w-3xl flex-col gap-10"
      aria-labelledby="landing-title"
    >
      <header className="flex flex-col gap-4">
        <h1
          id="landing-title"
          className="font-heading font-semibold text-3xl leading-tight sm:text-4xl"
        >
          Know what a craft is worth before you make it.
        </h1>
        <p className="text-lg text-muted-foreground">
          A market calculator for Dofus. Enter the prices you see at the
          marketplace and it costs out every recipe, ranks your profession by
          margin, and keeps a record of what a craft was worth when you checked.
        </p>
        <p className="flex items-center gap-2 text-muted-foreground text-sm">
          <WifiOffIcon className="size-4 shrink-0" />
          Runs entirely in your browser. No account, no server — your prices
          never leave this device.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Screen
          to={destinations.calculator}
          icon={CalculatorIcon}
          label="Calculator"
          description="Price one recipe ingredient by ingredient, across all four pack sizes, and see the margin at each sale tier."
        />
        <Screen
          to={destinations.crafts}
          icon={SparklesIcon}
          label="Crafts"
          description="Every recipe your prices can reach, ranked by margin — and which ingredient to price next to unlock the most of them."
        />
        <Screen
          to={destinations.watchlist}
          icon={StarIcon}
          label="Watchlist"
          description="The items you keep coming back to, each showing its current craft cost and margin."
        />
        <Screen
          to={destinations.snapshots}
          icon={CameraIcon}
          label="Snapshots"
          description="Freeze a craft's figures at today's prices, compare later, and restore that price book when you want it back."
        />
      </div>

      <section aria-labelledby="landing-how" className="flex flex-col gap-3">
        <h2 id="landing-how" className="font-heading font-medium">
          How it works
        </h2>
        <ol className="flex flex-col gap-3">
          <Step number={1}>
            Pick your server, then type the marketplace prices for a recipe's
            ingredients — one pack size is enough to start.
          </Step>
          <Step number={2}>
            Every recipe sharing those ingredients is costed at once, so the
            Crafts screen fills in as you price.
          </Step>
          <Step number={3}>
            Snapshot anything worth remembering. Prices go stale after a day and
            the app says so.
          </Step>
        </ol>
      </section>

      <footer className="border-t pt-6 text-muted-foreground text-xs">
        Kamargin <span className="tabular-nums">v{__APP_VERSION__}</span> · game
        data bundled from Dofus {GAME_DATA_VERSION}. Unofficial, and not
        affiliated with Ankama.
      </footer>
    </section>
  )
}
