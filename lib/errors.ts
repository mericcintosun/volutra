// The error contract shared by the API routes and the scripts.

export type ErrorCode =
  | "invalid_input"
  | "not_found"
  | "upstream_timeout"
  | "upstream_error"
  | "parse_failure"
  | "not_configured";

export interface ApiError {
  error: ErrorCode;
  hint: string;
}

export const HINTS: Record<ErrorCode, string> = {
  invalid_input: "The spiral id must be 3 to 40 lowercase letters, digits or hyphens.",
  not_found: "No spiral with this id is in the diary.",
  upstream_timeout: "The UCI 395 download took longer than the time limit.",
  upstream_error: "The UCI 395 download failed.",
  parse_failure: "A data file could not be read in the expected format.",
  not_configured: "This part of the build has not been set up yet.",
};
