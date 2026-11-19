import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";
import { normalize, metrics, flags } from "./history.js";

async function getJson(r) {
  const res = await api.asUser().requestJira(r, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Jira ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchIssueHistory(key) {
  const issue = await getJson(route`/rest/api/3/issue/${key}?fields=summary,status,created,assignee,priority`);
  const changelog = [];
  for (let startAt = 0; ; startAt += 100) {
    const page = await getJson(route`/rest/api/3/issue/${key}/changelog?startAt=${startAt}&maxResults=100`);
    changelog.push(...page.values);
    if (page.isLast || page.values.length === 0) break;
  }
  const comments = [];
  for (let startAt = 0; ; startAt += 100) {
    const page = await getJson(route`/rest/api/3/issue/${key}/comment?startAt=${startAt}&maxResults=100`);
    comments.push(...page.comments);
    if (startAt + page.comments.length >= page.total || page.comments.length === 0) break;
  }
  const events = normalize(changelog, comments);
  const m = metrics(events, { created: issue.fields.created, status: issue.fields.status?.name });
  return { key, summary: issue.fields.summary, status: issue.fields.status?.name, created: issue.fields.created, events, metrics: m, flags: flags(m) };
}

const resolver = new Resolver();
resolver.define("getIssueHistory", async ({ payload, context }) => fetchIssueHistory(payload.key || context.extension.issue.key));

// One page of a project export (keeps each invocation well under Forge time limits). No 10k cap: paginate with nextPageToken.
resolver.define("exportProjectPage", async ({ payload, context }) => {
  const projectKey = payload.projectKey || context.extension.project.key;
  const body = { jql: `project = "${projectKey}" ORDER BY key ASC`, fields: ["summary"], maxResults: 20, ...(payload.cursor ? { nextPageToken: payload.cursor } : {}) };
  const res = await api.asUser().requestJira(route`/rest/api/3/search/jql`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const page = await res.json();
  const issues = [];
  for (const it of page.issues || []) issues.push(await fetchIssueHistory(it.key));
  return { projectKey, issues, cursor: page.nextPageToken || null };
});

export const handler = resolver.getDefinitions();

// Rovo action: returns compact history for the agent to reason over.
export async function historyAction(payload) {
  const h = await fetchIssueHistory(payload.issueKey);
  return { key: h.key, summary: h.summary, status: h.status, metrics: h.metrics, flags: h.flags, timeline: h.events.slice(-150).map((e) => `${e.at} | ${e.author} | ${e.field}: ${e.from} -> ${e.to}`) };
}
