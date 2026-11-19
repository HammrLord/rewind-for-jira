import { render } from "../static/rewind/src/ui.js";
import { normalize, metrics, flags, fmtDur } from "../src/history.js";
import { HERO, PROJECT } from "./data.js";

const build = (x) => { const events = normalize(x.changelog, x.comments); const m = metrics(events, { created: x.created, now: x.now }); return { key: x.key, summary: x.summary, events, metrics: m, flags: flags(m) }; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const api = (moduleKey) => ({
  context: { moduleKey, extension: { issue: { key: "ACME-142" }, project: { key: "ACME" } } },
  getIssueHistory: async () => { await wait(500); return build(HERO); },
  exportProjectPage: async (_k, cursor) => { await wait(650); const i = cursor || 0, page = PROJECT.slice(i, i + 6).map(build); const next = i + 6 < PROJECT.length ? i + 6 : null; return { issues: page, cursor: next, progress: Math.round(((next ?? PROJECT.length) / PROJECT.length) * 100) }; },
});
render(document.getElementById("issueRoot"), api("rewind-issue-panel"));
render(document.getElementById("projectRoot"), api("rewind-project-page"));

document.querySelectorAll("[data-view]").forEach((a) => (a.onclick = () => {
  document.querySelectorAll("[data-view]").forEach((x) => x.classList.toggle("on", x === a));
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.id !== "v-" + a.dataset.view));
}));

// Rovo agent simulation: answer composed only from the action output.
function answer(q) {
  const h = build(HERO), m = h.metrics;
  const tis = Object.entries(m.timeInStatus).sort((a, b) => b[1] - a[1]);
  const st = h.events.filter((e) => e.field === "status");
  const keyEv = h.events.filter((e) => e.type === "field" && /status|assignee|priority|Story Points/i.test(e.field)).slice(0, 9);
  return `<h5>ACME-142 · ${h.summary}</h5>
  <p><b>Lead time ${fmtDur(m.leadMs)}</b>: ${m.reopens} reopen, ${m.hops} assignee hand-offs, estimate ${m.scope > 1 ? "grew twice (3 → 5 → 8)" : "changed"}.</p>
  <p><b>Where the time went:</b></p><ul>${tis.slice(0, 4).map(([s, ms]) => `<li>${s}: ${fmtDur(ms)}</li>`).join("")}</ul>
  <p><b>Why it took long:</b> marked Done on ${new Date(st.find((e) => e.to === "Done").at).toDateString()} but reopened by Meera Iyer (“still failing for PhonePe and Paytm”), then blocked in QA by the gateway sandbox.</p>
  <p><b>Key events:</b></p><ul>${keyEv.map((e) => `<li>${new Date(e.at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · ${e.author}: ${e.field} ${e.from || "∅"} → ${e.to || "∅"}</li>`).join("")}</ul>`;
}
const chat = document.getElementById("chat");
const ask = async (q) => {
  chat.insertAdjacentHTML("beforeend", `<div class="msg u">${q}</div>`);
  chat.insertAdjacentHTML("beforeend", `<div class="msg a typing" id="t">Rewind is calling get-issue-history…</div>`);
  await wait(1400); document.getElementById("t").remove();
  chat.insertAdjacentHTML("beforeend", `<div class="msg a">${answer(q)}</div>`);
};
["What changed on ACME-142 last week?", "How long did it spend in each status?", "Who changed the priority?"].forEach((s) => {
  const b = document.createElement("button"); b.textContent = s; b.onclick = () => ask(s); document.getElementById("starters").appendChild(b);
});
document.getElementById("ask").onsubmit = (e) => { e.preventDefault(); const q = document.getElementById("q").value.trim(); if (q) { ask(q); document.getElementById("q").value = ""; } };
