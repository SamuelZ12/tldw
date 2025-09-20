export function VideoSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-pulse">
      {/* Left Column - Video placeholder */}
      <div className="lg:col-span-2">
        <div className="sticky top-4">
          <div className="bg-gray-200 dark:bg-gray-700 aspect-video rounded-lg mb-4" />

          {/* Topic cards skeleton */}
          <div className="space-y-2 mt-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right Column - Tabs skeleton */}
      <div className="lg:col-span-1">
        <div className="sticky top-4">
          {/* Tab headers */}
          <div className="flex gap-2 mb-4">
            <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>

          {/* Content area */}
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    </div>
  );
}