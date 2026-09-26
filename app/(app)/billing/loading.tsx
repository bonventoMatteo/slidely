import { PageContainer } from "@/components/shared/PageHeader";
import { HeaderSkeleton } from "@/components/shared/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageContainer>
      <HeaderSkeleton />
      <Skeleton className="mt-8 h-24 w-full rounded-2xl" />
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-96 rounded-3xl" />
        ))}
      </div>
    </PageContainer>
  );
}
