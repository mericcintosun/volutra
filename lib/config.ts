// The only module that reads a server-side process.env key. Everything else imports its
// constants from here. (The build-time NEXT_PUBLIC_BRAND_FILES list predates this file and
// stays in lib/brand-files.ts.)
// No key here is a secret: Volutra runs on in-browser math and public data.

/** "real" serves converted UCI 395 recordings; anything else serves the seed stand-ins. */
export const ADAPTER_MODE: "real" | "fake" = process.env.ADAPTER_MODE === "real" ? "real" : "fake";

/** Prefix for every core-path log line. Logs carry counts and timings only, never point arrays. */
export { CORE_LOG } from "./log";

export const UCI_ZIP_URL =
  "https://archive.ics.uci.edu/static/public/395/parkinson+disease+spiral+drawings+using+digitized+graphics+tablet.zip";
export const UCI_CACHE_DIR = ".cache/uci";

export const FETCH_TIMEOUT_MS = 60000;
export const FETCH_RETRIES = 1;

export const CV_FOLDS = 5;
export const TRAIN_ITERATIONS = 4000;
export const TRAIN_LEARNING_RATE = 0.05;

/** Test ID of the static spiral test in the UCI 395 files (1 is dynamic, 2 is the stability test). */
export const UCI_TEST_ID_STATIC = 0;
