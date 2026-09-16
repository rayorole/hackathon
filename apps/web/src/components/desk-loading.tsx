import { LoaderCircle } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { loadingNl as t } from "@/lib/nl";

export function LoadingStatus({ label = t.loading }: { label?: string }) {
  return (
    <span
      role="status"
      className="inline-flex items-center gap-2 text-xs text-muted-foreground"
    >
      <LoaderCircle aria-hidden className="size-3.5 motion-safe:animate-spin" />
      {label}
    </span>
  );
}

export function DeskSkeleton({ detail = false }: { detail?: boolean }) {
  return (
    <div
      role="status"
      aria-label={t.loading}
      aria-busy="true"
      className="space-y-5"
    >
      <span className="sr-only">{t.loading}</span>
      <div aria-hidden="true" className="space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-9 w-28" />
        </div>
        {detail ? (
          <div className="grid gap-5 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-5 rounded-xl border p-6">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <div className="grid grid-cols-3 gap-8 border-b bg-muted/30 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-3 w-20" />
              ))}
            </div>
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="grid grid-cols-3 gap-8 border-b p-4 last:border-0"
              >
                <Skeleton className={i % 2 ? "h-4 w-2/3" : "h-4 w-4/5"} />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
