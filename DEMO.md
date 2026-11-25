# DEMO: Volutra in 90 seconds

**Demo start route: `/`**

## Problem

A person with Parkinson's keeps a paper on/off diary from memory. At the clinic they can say "it gets worse in the afternoon", but they have no number and no time to show the neurologist.

## Trigger

The levodopa dose wears off between doses, and nobody sees it happen at home. Volutra turns a 20-second spiral drawing into a tremor reading that can be repeated many times a day.

## Wow moment

A real Parkinson's patient's 2017 tablet spiral redraws itself at its own speed and the spectrum peak rises near 5 Hz. Then the presenter's own spiral stays flat on the same chart.

## Steps

Reset before recording: run `npm run demo:reset`, then press "Clear this device" on `/activity` (or use a private window), so `/activity` opens on the seeded Tue 24 Nov day with its 14:40 band.

1. `/` (`app/page.tsx`): today's six seeded spirals since the 08:00 dose, the 3D coil, and the day's verdict in plain sentences.
2. `/spirals/new` (`app/spirals/[id]/page.tsx`, `id = new`): draw a spiral on the pad, then read the result card: dominant frequency in Hz, amplitude in mm, the spectrum, and points per second.
3. `/spirals/uci-pwp-sst-07` (`app/spirals/[id]/page.tsx`): press Replay. The tablet recording redraws, the spectrum peak rises near 5 Hz, and the similarity bar appears with its model card status. The line under the pad names the UCI 395 subject file, or says plainly that a stand-in is shown.
4. `/spirals/uci-pwp-sst-07` (`app/spirals/[id]/page.tsx`): after the replay, press "Compare with my last drawing". The spiral drawn in step 2 appears as a flat olive line under the clay peak near 5 Hz; with no drawing on the device, the UCI control recording is drawn and labelled instead.
5. `/spirals` (`app/spirals/page.tsx`): filter by day, toggle "Past threshold only", search the notes, then open the control record `uci-ctl-sst-02` to compare.
6. `/activity` (`app/activity/page.tsx`): the 08:00 dose, the 14:40 wearing-off band, and changing the dose time to watch the baseline, threshold and marks recompute. A spiral saved on `/spirals/new` appears once, on a "Your device" day listed after the two seed days. The 16:30 second dose closes the window, so readings after it do not move the mark.
7. `/activity` print and CSV (`app/activity/page.tsx`): a one-page A4 printout with the "Not a diagnostic tool" line, and the CSV download.

## Closing

Nothing leaves the device; this page goes to the next appointment.

## Recording note

The builder records the 90-second video himself on the live URL, following steps 1, 2, 3, 4, 6 and 7.

## Honest status

The two UCI replays and the model weights become real through `npm run proof`: it converts two UCI 395 static spiral recordings into `data/uci/manifest.json` and trains `lib/model-weights.json` with subject-wise cross-validation. That proof run is committed, and the live site serves the recordings and trained weights when `ADAPTER_MODE=real`. In any other mode, or if the real adapter fails to load, the synthesized stand-ins are served and the line under the pad and the `/spirals` header say so.

The replay pick is disclosed: the Parkinson's replay is the file whose spectrum peak is in 4 to 6 Hz with the highest band amplitude, and the control replay is the control file with the lowest band amplitude. They are the clearest examples in the dataset, not typical ones. The 11 home spirals and both dose days stay synthesized from the seed fixture.
