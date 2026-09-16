import { uiNl } from "@/lib/nl"
import { cn } from "cn"
import { Loader2Icon } from "lucide-react"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon data-slot="spinner" role="status" aria-label={uiNl.loading} className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
