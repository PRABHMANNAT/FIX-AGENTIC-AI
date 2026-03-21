import { cn } from "@/lib/utils";

interface LoadingShimmerProps {
  className?: string;
}

export function LoadingShimmer({ className }: LoadingShimmerProps) {
  return <div className={cn("shimmer-block", className)} />;
}

export default LoadingShimmer;
