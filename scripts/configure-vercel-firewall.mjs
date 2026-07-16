const required = ["VERCEL_TOKEN", "VERCEL_PROJECT_ID"];
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is required.`);
}

const query = new URLSearchParams({ projectId: process.env.VERCEL_PROJECT_ID });
if (process.env.VERCEL_TEAM_ID) query.set("teamId", process.env.VERCEL_TEAM_ID);
const baseUrl = `https://api.vercel.com/v1/security/firewall/config?${query}`;
const headers = {
  Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
  "Content-Type": "application/json",
};

const active = await fetch(`${baseUrl.replace("/config?", "/config/active?")}`, { headers });
if (!active.ok) throw new Error(`Unable to read firewall configuration (${active.status}).`);
const configuration = await active.json();
const existing = (configuration.rules ?? configuration.active?.rules ?? []).find((rule) => rule.name === "School login - 10 per minute");

if (existing) {
  process.stdout.write("Login rate-limit rule already exists.\n");
  process.exit(0);
}

const response = await fetch(baseUrl, {
  method: "PATCH",
  headers,
  body: JSON.stringify({
    action: "rules.insert",
    value: {
      name: "School login - 10 per minute",
      description: "Distributed credential-stuffing protection for the school login endpoint.",
      active: true,
      conditionGroup: [{ conditions: [
        { type: "path", op: "eq", value: "/api/auth/login" },
        { type: "method", op: "eq", value: "POST" },
      ] }],
      action: { mitigate: { action: "rate_limit", rateLimit: {
        algo: "fixed_window",
        window: 60,
        limit: 10,
        keys: ["ip"],
        action: "deny",
      } } },
    },
  }),
});

if (!response.ok) throw new Error(`Unable to create firewall rule (${response.status}).`);
process.stdout.write("Created the Vercel login rate-limit rule.\n");
