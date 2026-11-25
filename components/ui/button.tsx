import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Kiln buttons: matte flat fills, a darker fired edge along the bottom, soft 0.375rem
// corners, no glow and no gradients.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_-3px_0_0_color-mix(in_oklab,var(--background)_30%,transparent)] hover:bg-primary/90",
        secondary: "border border-border bg-secondary text-secondary-foreground hover:bg-border",
        outline: "border border-border bg-transparent text-foreground hover:bg-muted",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-foreground underline decoration-primary decoration-[3px] underline-offset-[5px] hover:text-primary",
        segment:
          "border border-border bg-card text-muted-foreground hover:text-foreground aria-pressed:border-primary aria-pressed:bg-muted aria-pressed:text-foreground",
      },
      size: {
        default: "h-11 px-4 py-2",
        // sm is for non-demo uses only; every control on the demo path is 44px or taller
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-7 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
