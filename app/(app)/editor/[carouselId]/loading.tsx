import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-dvh flex-col" aria-busy="true" aria-label="Carregando editor">
      <div className="flex h-14 items-center gap-3 border-b border-white/5 px-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="ml-auto h-8 w-36" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[196px] flex-col gap-3 border-r border-white/5 p-3 lg:flex">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/5] w-full rounded-lg" />
          ))}
        </div>
        <div className="flex flex-1 items-center justify-center">
          <Skeleton className="aspect-[4/5] h-[70%] rounded-xl" />
        </div>
        <div className="hidden w-[340px] flex-col gap-4 border-l border-white/5 p-4 lg:flex">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
