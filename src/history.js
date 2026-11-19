// Pure history logic shared by the Forge backend, the Custom UI and the standalone demo.

export function adfToText(node) {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (node.type === "text") return node.text || "";
  const inner = (node.content || []).map(adfToText).join(node.type === "doc" ? "\n" : "");
  return node.type === "paragraph" ? inner + "\n" : inner;
}

// changelog: Jira changelog "values" [{id, author:{displayName}, created, items:[{field, fromString, toString}]}]
// comments: [{author:{displayName}, created, body(ADF|string)}]
export function normalize(changelog = [], comments = []) {
  const ev = [];
  for (const h of changelog) for (const it of h.items || [])
    ev.push({ at: h.created, author: h.author?.displayName || "Unknown", type: "field", field: it.field, from: it.fromString ?? "", to: it.toString ?? "" });
  for (const c of comments)
    ev.push({ at: c.created, author: c.author?.displayName || "Unknown", type: "comment", field: "Comment", from: "", to: adfToText(c.body).trim() });
  return ev.sort((a, b) => new Date(a.at) - new Date(b.at));
}

const DONE = /done|closed|resolved|released/i;
export function metrics(events, issue = {}) {
  const created = new Date(issue.created || (events[0] && events[0].at) || Date.now());
  const now = new Date(issue.now || Date.now());
  const st = events.filter((e) => e.type === "field" && e.field === "status");
  const tis = {};
  let cur = st.length ? st[0].from || issue.initialStatus || "To Do" : issue.status || "To Do";
  let t = created;
  for (const e of st) { const at = new Date(e.at); tis[cur] = (tis[cur] || 0) + (at - t); cur = e.to; t = at; }
  const finalDone = DONE.test(cur);
  if (!finalDone) tis[cur] = (tis[cur] || 0) + (now - t);
  const reopens = st.filter((e) => DONE.test(e.from) && !DONE.test(e.to)).length;
  const hops = events.filter((e) => e.type === "field" && e.field === "assignee" && e.from).length;
  const prio = events.filter((e) => e.type === "field" && e.field === "priority").length;
  const scope = events.filter((e) => e.type === "field" && /story points|estimate|sprint|fix version/i.test(e.field)).length;
  const actors = [...new Set(events.map((e) => e.author))];
  const last = events.length ? events[events.length - 1].at : issue.created;
  const leadMs = (finalDone ? new Date(st[st.length - 1].at) : now) - created;
  return { timeInStatus: tis, reopens, hops, prio, scope, actors, comments: events.filter((e) => e.type === "comment").length, changes: events.filter((e) => e.type === "field").length, last, leadMs, currentStatus: cur };
}

export function flags(m) {
  const f = [];
  if (m.reopens) f.push({ level: "high", text: `Reopened ${m.reopens}×`, why: "Work bounced back after Done" });
  if (m.hops >= 2) f.push({ level: "high", text: `${m.hops} assignee hand-offs`, why: "Ownership churn" });
  if (m.scope >= 2) f.push({ level: "med", text: `${m.scope} scope/estimate changes`, why: "Moving target" });
  if (m.prio >= 2) f.push({ level: "med", text: `Priority changed ${m.prio}×`, why: "Unclear urgency" });
  return f;
}

const esc = (v) => { const s = String(v ?? "").replace(/\r?\n/g, " "); return /[",]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export function toCSV(rows) {
  const head = ["Issue", "Summary", "When", "Who", "Type", "Field", "From", "To"];
  return "﻿" + [head.join(","), ...rows.map((r) => [r.key, r.summary, r.at, r.author, r.type, r.field, r.from, r.to].map(esc).join(","))].join("\n");
}

export const fmtDur = (ms) => { const h = ms / 36e5; return h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} d`; };
