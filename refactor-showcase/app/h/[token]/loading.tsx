/** Reader-Skeleton. Wird angezeigt, solange Session-Daten via Convex geladen werden. */
export default function ReaderLoading() {
  return (
    <div className="page-shell py-10">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="h-10 w-2/3 animate-pulse rounded-lg bg-black/10 dark:bg-white/10" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="card space-y-3">
          <div className="h-6 w-1/3 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="h-4 w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="h-4 w-4/6 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        </div>
        <div className="card space-y-3">
          <div className="h-6 w-1/3 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="h-4 w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        </div>
      </div>
    </div>
  );
}
