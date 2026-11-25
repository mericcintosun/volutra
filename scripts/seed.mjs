// npm run seed
// Validates fixtures/seed-diary.json (unique ids, HH:MM clocks) and writes it back sorted:
// tests by day descending, then clock ascending. Deterministic, so running it twice leaves
// the file byte-identical.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(root, "fixtures", "seed-diary.json");

const diary = JSON.parse(readFileSync(file, "utf8"));
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
const errors = [];

if (!diary || typeof diary !== "object") errors.push("root must be an object");
if (!Array.isArray(diary.doseDays)) errors.push("doseDays must be an array");
if (!Array.isArray(diary.tests)) errors.push("tests must be an array");

if (errors.length === 0) {
  const seen = new Set();
  for (const t of diary.tests) {
    if (typeof t.id !== "string" || !t.id) errors.push("a test has no id");
    else if (seen.has(t.id)) errors.push(`duplicate id: ${t.id}`);
    else seen.add(t.id);
    if (!CLOCK.test(String(t.clock))) errors.push(`${t.id}: clock "${t.clock}" is not HH:MM`);
  }
  const days = new Set();
  for (const d of diary.doseDays) {
    if (days.has(d.day)) errors.push(`duplicate dose day: ${d.day}`);
    days.add(d.day);
    if (!CLOCK.test(String(d.doseClock))) errors.push(`${d.day}: doseClock "${d.doseClock}" is not HH:MM`);
    if (d.nextDoseClock && !CLOCK.test(String(d.nextDoseClock))) errors.push(`${d.day}: nextDoseClock "${d.nextDoseClock}" is not HH:MM`);
  }
}

if (errors.length) {
  console.error(`seed: ${errors.length} problem(s) in fixtures/seed-diary.json`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
diary.tests.sort((a, b) => cmp(b.day, a.day) || cmp(a.clock, b.clock) || cmp(a.id, b.id));

writeFileSync(file, `${JSON.stringify(diary, null, 2)}\n`);
console.log(`seed: ${diary.tests.length} tests across ${diary.doseDays.length} dose days, fixtures/seed-diary.json normalized`);
