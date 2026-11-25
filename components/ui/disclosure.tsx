import * as React from "react";
import { cn } from "@/lib/utils";

// A native <details> panel styled as a kiln Card: SURFACE fill, LINE border, soft corners.
function Disclosure({ className, ...props }: React.ComponentProps<"details">) {
  return <details className={cn("group rounded-lg border border-border bg-card text-card-foreground", className)} {...props} />;
}

function DisclosureSummary({ className, ...props }: React.ComponentProps<"summary">) {
  return (
    <summary
      className={cn(
        "min-h-11 cursor-pointer rounded-lg p-5 marker:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:p-6",
        className
      )}
      {...props}
    />
  );
}

function DisclosureContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-5 pb-5 md:px-6 md:pb-6", className)} {...props} />;
}

export { Disclosure, DisclosureSummary, DisclosureContent };
