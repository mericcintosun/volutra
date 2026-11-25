import { hasBrandFile } from "@/lib/brand-files";
import { cn } from "@/lib/utils";

/**
 * The one brand mark. An uploaded public/brand/logo.png wins; otherwise the SVG mark at
 * public/logo.svg renders. The header uses this component and nothing else for the mark.
 */
export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  const src = hasBrandFile("logo") ? "/brand/logo.png" : "/logo.svg";
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} className={cn("shrink-0", className)} />;
}
