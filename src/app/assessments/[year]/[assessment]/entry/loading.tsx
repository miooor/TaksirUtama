export default function EntryLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="animate-pulse space-y-6">
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-stone-200" />
          <div className="h-8 w-56 rounded bg-stone-200" />
          <div className="h-4 w-72 rounded bg-stone-100" />
        </div>
        <div className="h-12 w-full max-w-md rounded-lg bg-stone-100" />
        <div className="overflow-hidden rounded-lg border">
          <div className="h-10 bg-stone-100" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-t px-4 py-3">
              <div className="h-4 w-8 rounded bg-stone-100" />
              <div className="h-4 flex-1 rounded bg-stone-100" />
              <div className="h-4 w-16 rounded bg-stone-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
