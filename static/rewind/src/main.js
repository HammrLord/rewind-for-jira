import { invoke, view } from "@forge/bridge";
import { render } from "./ui.js";
(async () => {
  const context = await view.getContext();
  const api = {
    context,
    getIssueHistory: (key) => invoke("getIssueHistory", { key }),
    exportProjectPage: (projectKey, cursor) => invoke("exportProjectPage", { projectKey, cursor }),
  };
  render(document.getElementById("root"), api);
})();
