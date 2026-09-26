import { PageContainer } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";

export function HeaderSkeleton() {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-11 w-40" />
    </div>
  );
}

export function CardGridSkeleton({ count = 8, aspect = "aspect-[4/5]" }: { count?: number; aspect?: string }) {
  return (
    <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className={`${aspect} w-full rounded-2xl`} />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({ count, aspect }: { count?: number; aspect?: string }) {
  return (
    <PageContainer>
      <HeaderSkeleton />
      <CardGridSkeleton count={count} aspect={aspect} />
    </PageContainer>
  );
}
