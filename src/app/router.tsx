import {
  CalculatorIcon,
  CameraIcon,
  CoinsIcon,
  SparklesIcon,
  StarIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router'

import { AppShell } from '@/components/layouts/app-shell'
import { ServerSelect } from '@/components/server-select'
import { SERVERS } from '@/config/servers'
import { getItem } from '@/lib/game-data'
import { cn } from '@/lib/utils'
import { restorePackPrices } from '@/stores/price-book'
import { useServer } from '@/stores/server'
import type { Item } from '@/types/game'
import type { Snapshot } from '@/types/saved'
import {
  itemParam,
  parseItemParam,
  parseServerParam,
  serverParam,
} from '@/utils/url-params'
import { HomeRoute } from './routes/home'
import { LandingRoute } from './routes/landing'
import { RecommendationsRoute } from './routes/recommendations'
import {
  SnapshotRoute,
  SnapshotsRoute,
  WatchlistRoute,
} from './routes/saved-items'
import {
  ScreenshotImportButton,
  ScreenshotImportProvider,
} from './screenshot-import'

const ROUTES = {
  cost: '/cost',
  crafts: '/crafts',
  watchlist: '/watchlist',
  snapshots: '/snapshots',
} as const

const TITLES: Record<string, string> = {
  '/': 'Kamargin',
  [ROUTES.cost]: 'Craft cost',
  [ROUTES.crafts]: 'What to craft',
  [ROUTES.watchlist]: 'Watchlist',
  [ROUTES.snapshots]: 'Snapshots',
}

/** Paths these screens first shipped under; kept so older links still open. */
const RENAMED = {
  '/calculator': ROUTES.cost,
  '/recommendations': ROUTES.crafts,
} as const

function RenamedRoute({ to }: { to: string }) {
  const { search } = useLocation()
  return <Navigate to={{ pathname: to, search }} replace />
}

export function AppRouter() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { serverId: storedServerId, selectServer } = useServer()
  const serverId =
    parseServerParam(searchParams.get('server')) ?? storedServerId
  const itemId = parseItemParam(searchParams.get('item'))
  const [lastItemId, setLastItemId] = useState(itemId)
  const activeItemId = location.pathname === ROUTES.cost ? itemId : null
  const mainRef = useRef<HTMLElement>(null)
  const title =
    TITLES[location.pathname] ??
    (location.pathname.startsWith(`${ROUTES.snapshots}/`)
      ? 'Snapshot'
      : 'Page not found')

  function href(path: string, selectedItemId?: number | null) {
    const params = new URLSearchParams({ server: serverParam(serverId) })
    if (selectedItemId !== undefined && selectedItemId !== null)
      params.set(
        'item',
        itemParam(selectedItemId, getItem(selectedItemId)?.name),
      )
    return `${path}?${params}`
  }

  useEffect(() => {
    if (storedServerId !== serverId) selectServer(serverId)
  }, [serverId, storedServerId, selectServer])

  useEffect(() => {
    if (location.pathname === ROUTES.cost) setLastItemId(itemId)
  }, [location.pathname, itemId])

  useEffect(() => {
    const pageTitle =
      activeItemId === null ? title : (getItem(activeItemId)?.name ?? title)
    const serverName = SERVERS.find((server) => server.id === serverId)?.name
    document.title =
      location.pathname === '/'
        ? 'Kamargin — Dofus craft margins'
        : `${pageTitle} | ${serverName} | Kamargin`
    mainRef.current?.focus({ preventScroll: true })
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [title, location.pathname, activeItemId, serverId])

  function openItem(item: Item | null) {
    navigate(href(ROUTES.cost, item?.id))
  }

  function openSnapshot(snapshot: Snapshot) {
    navigate(href(`${ROUTES.snapshots}/${snapshot.id}`), {
      state: { from: `${location.pathname}${location.search}` },
    })
  }

  function restore(snapshot: Snapshot) {
    restorePackPrices(serverId, snapshot.prices, snapshot.takenAt)
    navigate(href(ROUTES.cost, snapshot.itemId))
  }

  function closeSnapshot() {
    const from = (location.state as { from?: string } | null)?.from
    if (
      typeof from === 'string' &&
      (from.startsWith(`${ROUTES.cost}?`) ||
        from.startsWith(`${ROUTES.snapshots}?`))
    )
      navigate(-1)
    else navigate(href(ROUTES.snapshots), { replace: true })
  }

  const canonicalServer = serverParam(serverId)
  // An unreadable or unknown item keeps whatever was typed, or normalising would loop.
  const canonicalItem =
    itemId === null || !Number.isFinite(itemId)
      ? searchParams.get('item')
      : itemParam(itemId, getItem(itemId)?.name)

  if (
    searchParams.get('server') !== canonicalServer ||
    searchParams.get('item') !== canonicalItem
  ) {
    const normalized = new URLSearchParams(searchParams)
    normalized.set('server', canonicalServer)
    if (canonicalItem !== null) normalized.set('item', canonicalItem)
    return (
      <Navigate
        to={{ pathname: location.pathname, search: normalized.toString() }}
        replace
      />
    )
  }

  const destinations = [
    {
      path: ROUTES.cost,
      label: TITLES[ROUTES.cost],
      icon: CalculatorIcon,
      to: href(
        ROUTES.cost,
        location.pathname === ROUTES.cost ? itemId : lastItemId,
      ),
    },
    {
      path: ROUTES.crafts,
      label: TITLES[ROUTES.crafts],
      icon: SparklesIcon,
      to: href(ROUTES.crafts),
    },
    {
      path: ROUTES.watchlist,
      label: TITLES[ROUTES.watchlist],
      icon: StarIcon,
      to: href(ROUTES.watchlist),
    },
    {
      path: ROUTES.snapshots,
      label: TITLES[ROUTES.snapshots],
      icon: CameraIcon,
      to: href(ROUTES.snapshots),
    },
  ]

  return (
    <ScreenshotImportProvider serverId={serverId}>
      <AppShell
        title={title}
        brand={
          <Link
            to={href('/')}
            aria-label="Kamargin home"
            className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CoinsIcon
              aria-hidden
              className="size-8 shrink-0 text-primary"
              strokeWidth={1.75}
            />
            <span className="text-base leading-tight">Kamargin</span>
          </Link>
        }
        mainRef={mainRef}
        scroll={
          location.pathname === ROUTES.crafts
            ? 'panel'
            : location.pathname === ROUTES.cost
              ? 'panel-lg'
              : 'page'
        }
        serverControl={
          <>
            <ScreenshotImportButton />
            <ServerSelect
              value={serverId}
              onValueChange={(nextServerId) => {
                const next = new URLSearchParams(searchParams)
                next.set('server', serverParam(nextServerId))
                navigate({
                  pathname: location.pathname.startsWith(`${ROUTES.snapshots}/`)
                    ? ROUTES.snapshots
                    : location.pathname,
                  search: next.toString(),
                })
              }}
            />
          </>
        }
        nav={destinations.map(({ path, label, icon: Icon, to }) => (
          <NavLink
            key={path}
            to={to}
            end
            className={({ isActive }) =>
              cn(
                // Stacked below sm, where four labels on one line truncate to three letters.
                'flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md border-transparent border-b-2 px-1 text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:h-11 sm:flex-row sm:gap-1.5 sm:px-2 sm:text-sm lg:flex-none lg:px-3',
                isActive
                  ? 'border-primary bg-accent font-semibold text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )
            }
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      >
        <Routes>
          <Route
            path="/"
            element={
              <LandingRoute
                destinations={{
                  cost: href(ROUTES.cost, lastItemId),
                  crafts: href(ROUTES.crafts),
                  watchlist: href(ROUTES.watchlist),
                  snapshots: href(ROUTES.snapshots),
                }}
              />
            }
          />
          {Object.entries(RENAMED).map(([from, to]) => (
            <Route key={from} path={from} element={<RenamedRoute to={to} />} />
          ))}
          <Route
            path={ROUTES.cost}
            element={
              <HomeRoute
                key={serverId}
                serverId={serverId}
                itemId={itemId}
                onItemChange={openItem}
              />
            }
          />
          <Route
            path={ROUTES.crafts}
            element={
              <RecommendationsRoute
                key={serverId}
                serverId={serverId}
                onOpenItem={openItem}
                calculatorHref={href(ROUTES.cost, lastItemId)}
              />
            }
          />
          <Route
            path={ROUTES.watchlist}
            element={
              <WatchlistRoute
                serverId={serverId}
                onSelectItem={openItem}
                calculatorHref={href(ROUTES.cost, lastItemId)}
              />
            }
          />
          <Route
            path={ROUTES.snapshots}
            element={
              <SnapshotsRoute
                serverId={serverId}
                onOpen={openSnapshot}
                calculatorHref={href(ROUTES.cost, lastItemId)}
              />
            }
          />
          <Route
            path={`${ROUTES.snapshots}/:snapshotId`}
            element={
              <SnapshotRoute
                key={serverId}
                serverId={serverId}
                onClose={closeSnapshot}
                onOpenItem={openItem}
                onRestore={restore}
              />
            }
          />
          <Route
            path="*"
            element={
              <div className="flex flex-col gap-4">
                <h1 className="font-heading font-semibold text-xl">
                  Page not found
                </h1>
                <Link
                  className="text-primary underline underline-offset-4"
                  to={href(ROUTES.cost)}
                >
                  Open calculator
                </Link>
              </div>
            }
          />
        </Routes>
      </AppShell>
    </ScreenshotImportProvider>
  )
}
