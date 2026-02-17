import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ChartSkeleton({ count = 4 }: { count?: number }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="glass-card p-3 space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <div className="flex justify-center gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-1.5 w-1.5 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-5 space-y-4">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
