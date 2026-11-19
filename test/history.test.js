import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, metrics, flags, toCSV } from "../src/history.js";
import { HERO } from "../demo/data.js";

test("normalize merges changelog items and comments chronologically", () => {
  const ev = normalize(HERO.changelog, HERO.comments);
  assert.equal(ev.length, HERO.changelog.reduce((a, h) => a + h.items.length, 0) + HERO.comments.length);
  for (let i = 1; i < ev.length; i++) assert.ok(new Date(ev[i - 1].at) <= new Date(ev[i].at));
});
test("metrics: reopen, hand-offs, lead time to final Done", () => {
  const m = metrics(normalize(HERO.changelog, HERO.comments), { created: HERO.created, now: HERO.now });
  assert.equal(m.reopens, 1);
  assert.equal(m.hops, 3);
  assert.equal(m.currentStatus, "Done");
  assert.equal(Math.round(m.leadMs / 36e5), 410);
  assert.ok(!("Done" in m.timeInStatus) || m.timeInStatus.Done < 60 * 36e5);
});
test("flags surface churn", () => {
  const f = flags(metrics(normalize(HERO.changelog, HERO.comments), { created: HERO.created, now: HERO.now }));
  assert.ok(f.some((x) => /Reopened/.test(x.text)));
});
test("CSV escapes commas/quotes and has BOM", () => {
  const csv = toCSV([{ key: "A-1", summary: 'Say "hi", ok', at: "t", author: "x", type: "field", field: "f", from: "a", to: "b" }]);
  assert.ok(csv.startsWith("﻿"));
  assert.ok(csv.includes('"Say ""hi"", ok"'));
});
