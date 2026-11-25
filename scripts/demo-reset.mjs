// npm run demo:reset
// Returns the server side of the demo to its start state. There is no server store, so
// "server state" is the committed fixtures: the seed diary is re-normalized by
// scripts/seed.mjs (idempotent), and the UCI manifest and trained weights are checked.
// The visitor's own readings live in the browser; this script cannot reach them.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seedPath = join(root, "scripts", "seed.mjs");

try {
  execFileSync(process.execPath, [seedPath], { cwd: root, stdio: "inherit" });
} catch {
  console.error("demo:reset: scripts/seed.mjs failed, the seed diary was not reset.");
  process.exit(1);
}

function readStatus(rel) {
  try {
    const json = JSON.parse(readFileSync(join(root, rel), "utf8"));
    return typeof json.status === "string" ? json.status : "missing";
  } catch {
    return "unreadable";
  }
}

const manifest = readStatus(join("data", "uci", "manifest.json"));
if (manifest !== "converted") {
  console.error(`demo:reset: data/uci/manifest.json status is "${manifest}", expected "converted". Run npm run proof first.`);
  process.exit(1);
}

const weights = readStatus(join("lib", "model-weights.json"));
if (weights !== "trained") {
  console.error(`demo:reset: lib/model-weights.json status is "${weights}", expected "trained". Run npm run proof first.`);
  process.exit(1);
}

console.log("demo:reset: seed diary normalized, UCI recordings converted, model weights trained.");
console.log("Server state reset. In the browser, press Clear this device on /activity (or open a private window).");
