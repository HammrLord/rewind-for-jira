// Simulated Jira data for the standalone demo (people and issues are fictional).
const P = ["Priya Nair", "Arjun Mehta", "Sara Thomas", "Dev Kapoor", "Meera Iyer", "Rohan Das", "Lena Fischer"];
let seed = 42; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const iso = (d) => new Date(d).toISOString();
const adf = (t) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: t }] }] });

function hero() {
  const t0 = new Date("2026-10-01T09:12:00Z").getTime(), H = 36e5;
  const ch = (h, who, items) => ({ created: iso(t0 + h * H), author: { displayName: who }, items: items.map(([field, fromString, toString]) => ({ field, fromString, toString })) });
  const cm = (h, who, t) => ({ created: iso(t0 + h * H), author: { displayName: who }, body: adf(t) });
  return {
    key: "ACME-142", summary: "Checkout fails on UPI intent for Android 14", created: iso(t0), now: iso(t0 + 26 * 24 * H),
    changelog: [
      ch(2, "Meera Iyer", [["priority", "Medium", "High"]]),
      ch(5, "Meera Iyer", [["assignee", "", "Arjun Mehta"], ["Sprint", "", "Sprint 41"]]),
      ch(26, "Arjun Mehta", [["status", "To Do", "In Progress"]]),
      ch(30, "Arjun Mehta", [["Story Points", "3", "5"]]),
      ch(70, "Arjun Mehta", [["status", "In Progress", "In Review"], ["assignee", "Arjun Mehta", "Sara Thomas"]]),
      ch(94, "Sara Thomas", [["status", "In Review", "Done"], ["resolution", "", "Fixed"]]),
      ch(150, "Meera Iyer", [["status", "Done", "In Progress"], ["priority", "High", "Highest"], ["resolution", "Fixed", ""]]),
      ch(151, "Meera Iyer", [["assignee", "Sara Thomas", "Dev Kapoor"]]),
      ch(160, "Dev Kapoor", [["Story Points", "5", "8"], ["Sprint", "Sprint 41", "Sprint 42"]]),
      ch(230, "Dev Kapoor", [["status", "In Progress", "In Review"]]),
      ch(260, "Priya Nair", [["status", "In Review", "QA"], ["assignee", "Dev Kapoor", "Priya Nair"]]),
      ch(300, "Priya Nair", [["status", "QA", "Blocked"]]),
      ch(340, "Dev Kapoor", [["status", "Blocked", "QA"], ["Fix Version", "", "4.12.0"]]),
      ch(410, "Priya Nair", [["status", "QA", "Done"], ["resolution", "", "Fixed"]]),
    ],
    comments: [
      cm(3, "Meera Iyer", "Seeing ~4% checkout drop on Android 14 since Tuesday. UPI intent returns RESULT_CANCELED."),
      cm(28, "Arjun Mehta", "Repro on Pixel 8. The intent filter changed in Android 14; we need the package visibility query."),
      cm(93, "Sara Thomas", "LGTM, merged. Closing."),
      cm(149, "Meera Iyer", "Reopening: still failing for PhonePe and Paytm users, only GPay works."),
      cm(232, "Dev Kapoor", "Root cause: we only queried one package. Now querying all UPI apps via upi:// scheme."),
      cm(301, "Priya Nair", "Blocked: staging payment gateway sandbox is down."),
      cm(409, "Priya Nair", "Verified on 6 devices across 4 UPI apps. Shipping in 4.12.0."),
    ],
  };
}

const TITLES = ["Login OTP delayed for Jio users", "Crash on cart with 50+ items", "Dark mode contrast on receipts", "Add GST breakup to invoice PDF", "Search ignores Hindi transliteration", "Push notifications duplicated", "Refund status stuck at 'initiated'", "Address autocomplete slow", "Coupon stacking rule bug", "Accessibility labels on checkout", "Rate-limit OTP endpoint", "Migrate analytics SDK", "Wishlist sync across devices", "Order tracking map blank on iOS 18", "Improve cold start time", "Seller payout report export", "Fix flaky checkout e2e test", "Pincode serviceability cache", "Support UPI Lite", "Return pickup slot picker", "COD fee display mismatch", "Image CDN fallback", "Session timeout too aggressive"];
const FLOW = ["To Do", "In Progress", "In Review", "QA", "Done"];
function gen(i) {
  const t0 = new Date("2026-09-15T08:00:00Z").getTime() + i * 20 * 36e5, H = 36e5;
  const changelog = [], comments = []; let t = t0, st = 0, who = pick(P), asg = pick(P);
  changelog.push({ created: iso(t += 3 * H), author: { displayName: who }, items: [{ field: "assignee", fromString: "", toString: asg }] });
  const steps = 3 + Math.floor(rnd() * 6);
  for (let k = 0; k < steps; k++) {
    t += (6 + rnd() * 60) * H;
    if (rnd() < 0.18 && st === 4) { changelog.push({ created: iso(t), author: { displayName: pick(P) }, items: [{ field: "status", fromString: "Done", toString: "In Progress" }] }); st = 1; continue; }
    if (rnd() < 0.25) { const n = pick(P); changelog.push({ created: iso(t), author: { displayName: pick(P) }, items: [{ field: "assignee", fromString: asg, toString: n }] }); asg = n; continue; }
    if (rnd() < 0.15) { changelog.push({ created: iso(t), author: { displayName: pick(P) }, items: [{ field: "Story Points", fromString: "3", toString: "5" }] }); continue; }
    if (st < 4) { changelog.push({ created: iso(t), author: { displayName: asg }, items: [{ field: "status", fromString: FLOW[st], toString: FLOW[st + 1] }] }); st++; }
    if (rnd() < 0.4) comments.push({ created: iso(t + H), author: { displayName: pick(P) }, body: adf(pick(["Picking this up.", "Needs design review.", "PR is up.", "Can we split this?", "Tested on staging.", "Blocked on backend."])) });
  }
  return { key: `ACME-${101 + i}`, summary: TITLES[i % TITLES.length], created: iso(t0), now: "2026-10-27T09:00:00Z", changelog, comments };
}
export const HERO = hero();
export const PROJECT = [HERO, ...Array.from({ length: 23 }, (_, i) => gen(i))];
