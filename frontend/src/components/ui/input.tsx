import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 border-2 border-[var(--pos-brutal-fg)] rounded-none bg-[var(--pos-brutal-panel)] text-[var(--pos-brutal-fg)] font-bold px-3 py-1.5 text-base transition-shadow outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[var(--pos-brutal-fg)]/50 focus-visible:ring-0 shadow-[4px_4px_0_0_var(--pos-brutal-fg)] focus-visible:shadow-[6px_6px_0_0_var(--pos-brutal-fg)] focus-visible:translate-x-[-2px] focus-visible:translate-y-[-2px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
