import { toCSV, fmtDur, metrics as calcMetrics, flags as calcFlags } from "../../../src/history.js";

const h = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const initials = (n) => n.split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase();
const hue = (n) => [...n].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
const when = (iso) => new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const day = (iso) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
const CAT = (e) => e.type === "comment" ? "comments" : /^status$/i.test(e.field) ? "status" : /assignee/i.test(e.field) ? "assignee" : /priority/i.test(e.field) ? "priority" : "other";
const STATUS_COL = (s) => /done|closed|resolved/i.test(s) ? "#1F845A" : /progress|review|qa/i.test(s) ? "#5B3FD9" : /blocked/i.test(s) ? "#C9372C" : "#626F86";

function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
}

export async function render(root, api) {
  const isProject = /project/i.test(api.context?.moduleKey || "");
  root.innerHTML = `<div class="rw"><div class="rw-load"><span class="spin"></span> Rewinding history…</div></div>`;
  if (isProject) return renderProject(root, api);
  const data = await api.getIssueHistory(api.context?.extension?.issue?.key);
  renderIssue(root, data);
}

function renderIssue(root, d) {
  const m = d.metrics, ev = d.events;
  let filter = "all", q = "", tab = "timeline";
  const draw = () => {
    const list = ev.filter((e) => (filter === "all" || CAT(e) === filter) && (!q || JSON.stringify(e).toLowerCase().includes(q))).slice().reverse();
    const groups = {}; list.forEach((e) => (groups[day(e.at)] = groups[day(e.at)] || []).push(e));
    const total = Object.values(m.timeInStatus).reduce((a, b) => a + b, 0) || 1;
    root.innerHTML = `<div class="rw">
      <header class="rw-h"><div class="rw-logo">⟲</div><div><b>Rewind</b><span>${h(d.key)} · ${ev.length} events · ${m.actors.length} people</span></div>
        <div class="rw-flags">${d.flags.map((f) => `<span class="flag ${f.level}" title="${h(f.why)}">${h(f.text)}</span>`).join("") || `<span class="flag ok">No churn signals</span>`}</div></header>
      <nav class="rw-tabs">${["timeline", "metrics", "export"].map((t) => `<button data-tab="${t}" class="${tab === t ? "on" : ""}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</nav>
      ${tab === "timeline" ? `<div class="rw-tools"><div class="chips">${["all", "status", "assignee", "priority", "comments", "other"].map((c) => `<button data-f="${c}" class="${filter === c ? "on" : ""}">${c}</button>`).join("")}</div>
        <input class="rw-q" placeholder="Search history…" value="${h(q)}"></div>
        <div class="rw-tl">${Object.entries(groups).map(([g, items]) => `<div class="day">${g}</div>${items.map((e) => `
          <div class="ev ${CAT(e)}"><span class="av" style="background:hsl(${hue(e.author)} 55% 45%)">${initials(e.author)}</span>
          <div class="body"><div class="meta"><b>${h(e.author)}</b> ${e.type === "comment" ? "commented" : `changed <span class="fld">${h(e.field)}</span>`}<time>${when(e.at)}</time></div>
          ${e.type === "comment" ? `<div class="cm">${h(e.to)}</div>` : `<div class="chg"><span class="from">${h(e.from) || "∅"}</span><span class="arr">→</span><span class="to" ${/^status$/i.test(e.field) ? `style="background:${STATUS_COL(e.to)};color:#fff"` : ""}>${h(e.to) || "∅"}</span></div>`}</div></div>`).join("")}`).join("") || `<p class="empty">No events match.</p>`}</div>` : ""}
      ${tab === "metrics" ? `<div class="kpis">
        <div class="kpi"><b>${fmtDur(m.leadMs)}</b><span>lead time</span></div><div class="kpi ${m.reopens ? "bad" : ""}"><b>${m.reopens}</b><span>reopens</span></div>
        <div class="kpi ${m.hops >= 3 ? "bad" : ""}"><b>${m.hops}</b><span>hand-offs</span></div><div class="kpi"><b>${m.changes}</b><span>field changes</span></div>
        <div class="kpi"><b>${m.comments}</b><span>comments</span></div><div class="kpi"><b>${m.actors.length}</b><span>people</span></div></div>
        <h4>Time in status</h4><div class="tis">${Object.entries(m.timeInStatus).sort((a, b) => b[1] - a[1]).map(([s, ms]) => `<div class="row"><span class="s">${h(s)}</span><div class="bar"><i style="width:${(ms / total * 100).toFixed(1)}%;background:${STATUS_COL(s)}"></i></div><span class="v">${fmtDur(ms)}</span></div>`).join("")}</div>` : ""}
      ${tab === "export" ? `<div class="exp">
        <button class="big" data-x="csv"><b>Excel / CSV</b><span>Every change and comment, one row each</span></button>
        <button class="big" data-x="json"><b>JSON archive</b><span>Full fidelity, re-importable</span></button>
        <button class="big" data-x="md"><b>Copy summary</b><span>Paste into Confluence or Slack</span></button></div>
        <p class="note">Solves JRACLOUD-38896: "Allow export of Jira issue details into Excel, i.e. Activity and History" (open since 2014).</p>` : ""}
    </div>`;
    root.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => { tab = b.dataset.tab; draw(); }));
    root.querySelectorAll("[data-f]").forEach((b) => (b.onclick = () => { filter = b.dataset.f; draw(); }));
    const qi = root.querySelector(".rw-q"); if (qi) qi.oninput = (e) => { q = e.target.value.toLowerCase(); const pos = e.target.selectionStart; draw(); const n = root.querySelector(".rw-q"); n.focus(); n.setSelectionRange(pos, pos); };
    root.querySelectorAll("[data-x]").forEach((b) => (b.onclick = async () => {
      const rows = ev.map((e) => ({ key: d.key, summary: d.summary, ...e }));
      if (b.dataset.x === "csv") download(`${d.key}-history.csv`, toCSV(rows), "text/csv");
      if (b.dataset.x === "json") download(`${d.key}-history.json`, JSON.stringify(d, null, 2), "application/json");
      if (b.dataset.x === "md") { const md = `**${d.key}: ${d.summary}**\nLead time ${fmtDur(m.leadMs)} · ${m.reopens} reopens · ${m.hops} hand-offs\n` + Object.entries(m.timeInStatus).map(([s, ms]) => `- ${s}: ${fmtDur(ms)}`).join("\n"); try { await navigator.clipboard.writeText(md); } catch {} b.querySelector("b").textContent = "Copied ✓"; }
    }));
  };
  draw();
}

async function renderProject(root, api) {
  const key = api.context?.extension?.project?.key || "PROJ";
  root.innerHTML = `<div class="rw"><header class="rw-h"><div class="rw-logo">⟲</div><div><b>Rewind · Project export</b><span>${h(key)} · full history backup, no 10,000-row cap</span></div></header>
    <div class="pj"><button class="go" id="go">Export entire project</button><div class="prog"><i id="pbar"></i></div><div id="pstat" class="pstat">Ready. Exports every issue with its full changelog and comments.</div></div><div id="pres"></div></div>`;
  root.querySelector("#go").onclick = async () => {
    const all = []; let cursor = null, pages = 0;
    root.querySelector("#go").disabled = true;
    do {
      const page = await api.exportProjectPage(key, cursor);
      all.push(...page.issues); cursor = page.cursor; pages++;
      root.querySelector("#pbar").style.width = (page.progress != null ? page.progress : Math.min(95, pages * 18)) + "%";
      root.querySelector("#pstat").textContent = `Exported ${all.length} issues · ${all.reduce((a, i) => a + i.events.length, 0)} events…`;
    } while (cursor);
    root.querySelector("#pbar").style.width = "100%";
    const events = all.reduce((a, i) => a + i.events.length, 0);
    const hot = all.map((i) => ({ ...i, score: i.metrics.reopens * 3 + i.metrics.hops + i.metrics.scope })).sort((a, b) => b.score - a.score).slice(0, 6);
    root.querySelector("#pstat").textContent = `Done: ${all.length} issues · ${events} events.`;
    root.querySelector("#pres").innerHTML = `<div class="kpis"><div class="kpi"><b>${all.length}</b><span>issues</span></div><div class="kpi"><b>${events}</b><span>history events</span></div>
      <div class="kpi bad"><b>${all.reduce((a, i) => a + i.metrics.reopens, 0)}</b><span>reopens</span></div><div class="kpi"><b>${all.reduce((a, i) => a + i.metrics.hops, 0)}</b><span>hand-offs</span></div></div>
      <h4>Churn hotspots</h4><table class="hot"><tr><th>Issue</th><th>Summary</th><th>Reopens</th><th>Hand-offs</th><th>Scope changes</th></tr>
      ${hot.map((i) => `<tr><td><b>${h(i.key)}</b></td><td>${h(i.summary)}</td><td>${i.metrics.reopens}</td><td>${i.metrics.hops}</td><td>${i.metrics.scope}</td></tr>`).join("")}</table>
      <div class="exp"><button class="big" id="pcsv"><b>Excel / CSV</b><span>${events} rows</span></button><button class="big" id="pjson"><b>JSON backup</b><span>Single-project archive</span></button></div>
      <p class="note">Addresses JRACLOUD-34307 "Allow single project export" (1,031 votes, open since 2013) and JRACLOUD-95441 (10,000-item CSV cap).</p>`;
    root.querySelector("#pcsv").onclick = () => download(`${key}-history.csv`, toCSV(all.flatMap((i) => i.events.map((e) => ({ key: i.key, summary: i.summary, ...e })))), "text/csv");
    root.querySelector("#pjson").onclick = () => download(`${key}-backup.json`, JSON.stringify({ project: key, exportedAt: new Date().toISOString(), issues: all }, null, 2), "application/json");
  };
}

export { calcMetrics, calcFlags };
