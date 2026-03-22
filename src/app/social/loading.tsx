// src/app/social/loading.tsx
import LoadingShimmer from "@/components/ui/LoadingShimmer";

export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-[var(--background)]">
      <div className="flex flex-col items-center gap-4">
        <LoadingShimmer className="h-12 w-12 rounded-full" />
        <LoadingShimmer className="h-4 w-32 rounded" />
      </div>
    </div>
  );
}
