import { hasBrandFile } from "@/lib/brand-files";
import { cn } from "@/lib/utils";

interface SceneSlotProps {
  n: 1 | 2 | 3 | 4 | 5 | 6;
  /** What the picture shows (not the section it sits in). */
  alt: string;
  width: number;
  height: number;
  className?: string;
}

/**
 * One illustration slot. An uploaded public/brand/scene-{n}.png wins; otherwise the
 * hand-drawn SVG at public/illustrations/scene-{n}.svg renders. Call it with literal
 * values (n, alt, width, height): the image prompts are written from these tags.
 */
export function SceneSlot({ n, alt, width, height, className }: SceneSlotProps) {
  const src = hasBrandFile(`scene-${n}`) ? `/brand/scene-${n}.png` : `/illustrations/scene-${n}.svg`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} loading={n === 1 ? "eager" : "lazy"} className={cn("h-auto w-full max-w-full", className)} />
  );
}
