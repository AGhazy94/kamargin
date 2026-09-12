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
import { HomeRoute } from './routes/home'
import { LandingRoute } from './routes/landing'
import { RecommendationsRoute } from './routes/recommendations'
import {
  SnapshotRoute,
  SnapshotsRoute,
  WatchlistRoute,
} from './routes/saved-items'

export function AppRouter() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { serverId: storedServerId, selectServer } = useServer()
  const serverId =
    SERVERS.find((server) => server.id === Number(searchParams.get('server')))
      ?.id ?? storedServerId
  const itemId = searchParams.has('item')
    ? Number(searchParams.get('item'))
    : null
  const [lastItemId, setLastItemId] = useState(itemId)
  const activeItemId = location.pathname === '/calculator' ? itemId : null
  const mainRef = useRef<HTMLElement>(null)
  const title =
    location.pathname === '/'
      ? 'Kamargin'
      : location.pathname === '/calculator'
        ? 'Calculator'
        : location.pathname === '/recommendations'
          ? 'Recommendations'
          : location.pathname === '/watchlist'
            ? 'Watchlist'
            : 'Snapshots'

  function href(path: string, selectedItemId?: number | null) {
    const params = new URLSearchParams({ server: String(serverId) })
    if (selectedItemId !== undefined && selectedItemId !== null)
      params.set('item', String(selectedItemId))
    return `${path}?${params}`
  }

  useEffect(() => {
    if (storedServerId !== serverId) selectServer(serverId)
  }, [serverId, storedServerId, selectServer])

  useEffect(() => {
    if (location.pathname === '/calculator') setLastItemId(itemId)
  }, [location.pathname, itemId])

  useEffect(() => {
    const pageTitle =
      activeItemId === null
        ? location.pathname.startsWith('/snapshots/')
          ? 'Snapshot'
          : title
        : (getItem(activeItemId)?.name ?? title)
    const serverName = SERVERS.find((server) => server.id === serverId)?.name
    document.title =
      location.pathname === '/'
        ? 'Kamargin — Dofus craft margins'
        : `${pageTitle} | ${serverName} | Kamargin`
    mainRef.current?.focus({ preventScroll: true })
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [title, location.pathname, activeItemId, serverId])

  function openItem(item: Item | null) {
    navigate(href('/calculator', item?.id))
  }

  function openSnapshot(snapshot: Snapshot) {
    navigate(href(`/snapshots/${snapshot.id}`), {
      state: { from: `${location.pathname}${location.search}` },
    })
  }

  function restore(snapshot: Snapshot) {
    restorePackPrices(serverId, snapshot.prices, snapshot.takenAt)
    navigate(href('/calculator', snapshot.itemId))
  }

  function closeSnapshot() {
    const from = (location.state as { from?: string } | null)?.from
    if (
      typeof from === 'string' &&
      (from.startsWith('/calculator?') || from.startsWith('/snapshots?'))
    )
      navigate(-1)
    else navigate(href('/snapshots'), { replace: true })
  }

  if (searchParams.get('server') !== String(serverId)) {
    const normalized = new URLSearchParams(searchParams)
    normalized.set('server', String(serverId))
    return (
      <Navigate
        to={{ pathname: location.pathname, search: normalized.toString() }}
        replace
      />
    )
  }

  const destinations = [
    {
      path: '/calculator',
      label: 'Calculator',
      icon: CalculatorIcon,
      to: href(
        '/calculator',
        location.pathname === '/calculator' ? itemId : lastItemId,
      ),
    },
    {
      path: '/recommendations',
      label: 'Crafts',
      icon: SparklesIcon,
      to: href('/recommendations'),
    },
    {
      path: '/watchlist',
      label: 'Watchlist',
      icon: StarIcon,
      to: href('/watchlist'),
    },
    {
      path: '/snapshots',
      label: 'Snapshots',
      icon: CameraIcon,
      to: href('/snapshots'),
    },
  ]

  return (
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
        location.pathname === '/recommendations'
          ? 'panel'
          : location.pathname === '/calculator'
            ? 'panel-lg'
            : 'page'
      }
      serverControl={
        <ServerSelect
          value={serverId}
          onValueChange={(nextServerId) => {
            const next = new URLSearchParams(searchParams)
            next.set('server', String(nextServerId))
            navigate({
              pathname: location.pathname.startsWith('/snapshots/')
                ? '/snapshots'
                : location.pathname,
              search: next.toString(),
            })
          }}
        />
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
                calculator: href('/calculator', lastItemId),
                crafts: href('/recommendations'),
                watchlist: href('/watchlist'),
                snapshots: href('/snapshots'),
              }}
            />
          }
        />
        <Route
          path="/calculator"
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
          path="/recommendations"
          element={
            <RecommendationsRoute
              key={serverId}
              serverId={serverId}
              onOpenItem={openItem}
              calculatorHref={href('/calculator', lastItemId)}
            />
          }
        />
        <Route
          path="/watchlist"
          element={
            <WatchlistRoute
              serverId={serverId}
              onSelectItem={openItem}
              calculatorHref={href('/calculator', lastItemId)}
            />
          }
        />
        <Route
          path="/snapshots"
          element={
            <SnapshotsRoute
              serverId={serverId}
              onOpen={openSnapshot}
              calculatorHref={href('/calculator', lastItemId)}
            />
          }
        />
        <Route
          path="/snapshots/:snapshotId"
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
                to={href('/calculator')}
              >
                Open calculator
              </Link>
            </div>
          }
        />
      </Routes>
    </AppShell>
  )
}
