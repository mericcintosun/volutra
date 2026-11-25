import * as React from "react";
import { cn } from "@/lib/utils";

// Recessed field: GROUND fill inside a LINE border, clay border on focus.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [color-scheme:dark]",
        className
      )}
      {...props}
    />
  );
}

export { Input };
