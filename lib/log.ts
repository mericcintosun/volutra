// The core-path log prefix, in its own module so client-bundled code (lib/model.ts) can log
// without importing lib/config.ts. lib/config.ts re-exports it for server code and scripts.
export const CORE_LOG = "[core]";
