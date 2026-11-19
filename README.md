# Rewind for Jira

**Every change. Every comment. Exportable and explainable.**

Rewind is an Atlassian Forge app. It turns Jira's locked activity history into a filterable timeline, flow metrics, Excel/JSON exports, a single-project backup with no 10,000-row cap, and a Rovo agent that answers "what happened and why?".

- **Live demo** (simulated Jira data): https://hammrlord.github.io/rewind-for-jira/demo/
- **Pitch deck:** https://hammrlord.github.io/rewind-for-jira/deck.html
- **Demo video:** https://hammrlord.github.io/rewind-for-jira/demo.mp4

Built for **Codegeist 2026**.

## The demand
- [JRACLOUD-34307](https://jira.atlassian.com/browse/JRACLOUD-34307), "Allow single project export": 1,031 votes, open since 2013
- [JRACLOUD-38896](https://jira.atlassian.com/browse/JRACLOUD-38896), "Export issue Activity and History to Excel": 229 votes, marked Not Being Considered
- [JRACLOUD-95441](https://jira.atlassian.com/browse/JRACLOUD-95441): CSV export capped at 10,000 items

## Modules
| Module | What it does |
|---|---|
| `jira:issuePanel` | Timeline with field filters and search; metrics (lead time, time in status, reopens, hand-offs, scope changes); exports to CSV/JSON/summary |
| `jira:projectPage` | Paged export of every issue with full changelog and comments (JQL `nextPageToken`, so no 10k cap); churn hotspots; CSV/JSON backup |
| `rovo:agent` + `action` | The Rewind agent calls `get-issue-history` and answers with exact dates, people and values |

## Architecture
`src/history.js` is pure, unit-tested logic (normalize → metrics → flags → CSV), and the same file powers:
- the Forge resolvers (`src/index.js`)
- the Custom UI (`static/rewind/src/ui.js`)
- the standalone demo (`demo/`)

Scopes are `read:jira-work` and `read:jira-user` only. The app runs on Atlassian, with no external egress and no stored data.

## Deploy
```bash
npm install
npm run build:ui
npm test
npm install -g @forge/cli && forge login
forge register          # writes your app id into manifest.yml
forge deploy
forge install           # choose your Jira Cloud dev site
```

## Run the demo locally
`python3 -m http.server 8000`, then open http://localhost:8000/demo/
