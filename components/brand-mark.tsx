import Image from "next/image";
import { hasBrandFile } from "@/lib/brand-files";
import { cn } from "@/lib/utils";

/**
 * The one brand mark. An uploaded public/brand/logo.png wins; otherwise the SVG mark at
 * public/logo.svg renders. The header uses this component and nothing else for the mark.
 */
export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  const isPng = hasBrandFile("logo");
  const src = isPng ? "/brand/logo.png" : "/logo.svg";
  return <Image src={src} alt="" width={size} height={size} unoptimized={!isPng} priority className={cn("shrink-0", className)} />;
}
