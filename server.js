/**
 * Serves the static site and accepts form POSTs (saved under ./data for testing).
 * Render: Web Service with startCommand "npm start"
 */
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const ROOT = __dirname;
const DATA = path.join(ROOT, "data");

function appendJsonl(filename, payload) {
  fs.mkdirSync(DATA, { recursive: true });
  const line = JSON.stringify({ ...payload, savedAt: new Date().toISOString() }) + "\n";
  fs.appendFileSync(path.join(DATA, filename), line, "utf8");
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/api/contact", (req, res) => {
  appendJsonl("contact.jsonl", req.body);
  res.redirect(303, "/thank-you.html?from=contact");
});

app.post("/api/contact-lead", (req, res) => {
  appendJsonl("contact-leads.jsonl", req.body);
  res.redirect(303, "/thank-you.html?from=contact");
});

app.post("/api/care-request", (req, res) => {
  appendJsonl("care-requests.jsonl", req.body);
  const raw = String(req.body.service || "companionship").toLowerCase();
  const service = /^[a-z0-9-]+$/.test(raw) ? raw : "companionship";
  const qs = new URLSearchParams();
  qs.set("service", service);
  if (req.body.intro_date) qs.set("date", req.body.intro_date);
  if (req.body.intro_time) qs.set("time", req.body.intro_time);
  res.redirect(303, `/thank-you.html?${qs.toString()}`);
});

app.use(express.static(ROOT));

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
