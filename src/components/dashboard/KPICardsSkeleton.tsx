import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

export default function KPICardsSkeleton() {
  const isMobile = useIsMobile();
  const count = isMobile ? 3 : 6;

  return (
    <div>
      {/* Mobile: horizontal scroll */}
      <div className="flex gap-3 overflow-hidden pb-2 md:hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="glass-card p-4 min-w-[160px] w-[44vw] shrink-0 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-2.5 w-20" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>

      {/* Desktop: grid */}
      <div className="hidden md:grid grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-2.5 w-20" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
