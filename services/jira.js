const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || "KAN";

const authHeader =
  "Basic " + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");

async function jiraFetch(path, options = {}) {
  const res = await fetch(`${JIRA_BASE_URL}/rest/api/3${path}`, {
    ...options,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jira API error ${res.status}: ${text}`);
  }

  return res.json();
}

async function fetchEpics() {
  const jql = `project = ${JIRA_PROJECT_KEY} AND issuetype = Epic ORDER BY summary ASC`;
  const data = await jiraFetch("/search/jql", {
    method: "POST",
    body: JSON.stringify({
      jql,
      fields: ["summary"],
      maxResults: 100,
    }),
  });

  return data.issues.map((issue) => ({
    key: issue.key,
    summary: issue.fields.summary,
  }));
}

async function createIssue({ type, epicKey, summary, description }) {
  // Bug = 10005, Feature = 10004
  const issueTypeId = type === "bug" ? "10005" : "10004";

  const body = {
    fields: {
      project: { key: JIRA_PROJECT_KEY },
      issuetype: { id: issueTypeId },
      summary,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: description || "No description" }],
          },
        ],
      },
      parent: { key: epicKey },
    },
  };

  return jiraFetch("/issue", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function addAttachment(issueKey, fileBuffer, filename) {
  const formData = new FormData();
  formData.append("file", new Blob([fileBuffer]), filename);

  const res = await fetch(
    `${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/attachments`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "X-Atlassian-Token": "no-check",
      },
      body: formData,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jira attachment error ${res.status}: ${text}`);
  }

  return res.json();
}

module.exports = { fetchEpics, createIssue, addAttachment };
