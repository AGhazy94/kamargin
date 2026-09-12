export function MainErrorFallback() {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-neutral-950 text-neutral-100"
      role="alert"
    >
      <h2 className="font-semibold text-xl">Something went wrong</h2>
      <button
        type="button"
        className="rounded bg-neutral-800 px-4 py-2 hover:bg-neutral-700"
        onClick={() => window.location.assign(window.location.origin)}
      >
        Refresh
      </button>
    </div>
  )
}
