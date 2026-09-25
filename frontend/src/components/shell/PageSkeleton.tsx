/** Placeholder while a page's code loads. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-5">
      <div className="skeleton h-9 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
      <div className="skeleton h-80" />
    </div>
  );
}
