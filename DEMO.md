# DEMO: Volutra in 90 seconds

**Demo start route: `/`**

## Problem

A person with Parkinson's keeps a paper on/off diary from memory. At the clinic they can say "it gets worse in the afternoon", but they have no number and no time to show the neurologist.

## Trigger

The levodopa dose wears off between doses, and nobody sees it happen at home. Volutra turns a 20-second spiral drawing into a tremor reading that can be repeated many times a day.

## Wow moment

A real Parkinson's patient's 2017 tablet spiral redraws itself at its own speed and the spectrum peak rises near 5 Hz. Then the presenter's own spiral stays flat on the same chart.

## Steps

1. `/` (`app/page.tsx`): today's six seeded spirals since the 08:00 dose, the 3D coil, and the day's verdict in plain sentences.
2. `/spirals/new` (`app/spirals/[id]/page.tsx`, `id = new`): draw a spiral on the pad, then read the result card: dominant frequency in Hz, amplitude in mm, the spectrum, and points per second.
3. `/spirals/uci-pwp-sst-07` (`app/spirals/[id]/page.tsx`): press Replay. The tablet recording redraws, the spectrum peak rises near 5 Hz, and the similarity bar appears with its model card status.
4. `/spirals` (`app/spirals/page.tsx`): filter by day, toggle "Past threshold only", search the notes, then open the control record `uci-ctl-sst-02` to compare.
5. `/activity` (`app/activity/page.tsx`): the 08:00 dose, the 14:40 wearing-off band, and changing the dose time to watch the baseline, threshold and marks recompute.
6. `/activity` print and CSV (`app/activity/page.tsx`): a one-page A4 printout with the "Not a diagnostic tool" line, and the CSV download.

## Closing

Nothing leaves the device; this page goes to the next appointment.

## Recording note

The builder records the 90-second video himself on the live URL, following steps 1, 2, 3, 5 and 6.

## Honest status

Until Phase 2 lands, the two UCI records are synthesized stand-ins and the model weights are provisional. The UI labels both. No accuracy figure is shown until one is measured.
