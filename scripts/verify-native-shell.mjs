import fs from "node:fs";

const required = [
  "app/layout.js",
  "app/page.js",
  "app/ShivaApp.js",
  "app/globals.css",
  "app/design-system.css",
  "app/api/players/route.js",
  "app/api/coach/route.js",
  "app/api/edge/route.js",
  "app/api/espn/route.js",
  "vercel.json"
];

for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing native app file: ${file}`);
}

const active = required
  .filter((file) => file.endsWith(".js") || file.endsWith(".css"))
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");

for (const forbidden of [
  "streamlit",
  "stAppViewContainer",
  "data-testid=\"st",
  "type=\"radio\"",
  "role=\"radio\""
]) {
  if (active.toLowerCase().includes(forbidden.toLowerCase())) {
    throw new Error(`Forbidden legacy UI token survived: ${forbidden}`);
  }
}

const css = fs.readFileSync("app/globals.css", "utf8");
for (const token of [
  ".splash",
  ".kickoff-clock",
  ".pill.active",
  ".bottom-nav",
  ".coach-hero",
  "env(safe-area-inset-top)",
  ".edge-preview-grid",
  ".draft-start-card .primary-cta"
]) {
  if (!css.includes(token)) throw new Error(`Missing mobile UI contract: ${token}`);
}

const design = fs.readFileSync("app/design-system.css", "utf8");
for (const token of [
  "--shiva-touch:",
  "--shiva-body:",
  ".topbar",
  ".kickoff-clock",
  ".draft-start-card .primary-cta",
  "font-variant-numeric:tabular-nums"
]) {
  if (!design.includes(token)) throw new Error(`Missing shared design-system contract: ${token}`);
}

const touchMatch = design.match(/--shiva-touch:\s*([0-9.]+)px/i);
if (!touchMatch || Number(touchMatch[1]) < 44) {
  throw new Error("Shared design system must preserve a mobile touch target of at least 44px.");
}

const bodyMatch = design.match(/--shiva-body:\s*([0-9.]+)px/i);
if (!bodyMatch || Number(bodyMatch[1]) < 16) {
  throw new Error("Shared design system must preserve a readable body size of at least 16px.");
}

if (/\.draft-start-card \.primary-cta[\s\S]*?(#d73a45|#ef6670)/i.test(design)) {
  throw new Error("Red mock-draft primary action survived in shared design system.");
}

const layout = fs.readFileSync("app/layout.js", "utf8");
for (const token of [
  'import "./design-system.css"',
  "background: \"#071019\"",
  "apple-mobile-web-app-status-bar-style",
  "viewportFit: \"cover\""
]) {
  if (!layout.includes(token)) throw new Error(`Missing first-paint/mobile-shell contract: ${token}`);
}

const app = fs.readFileSync("app/ShivaApp.js", "utf8");
for (const token of [
  "The Shiva Edge",
  "Raise the floor",
  "Keep the ceiling",
  "Shiva Blast",
  "Start Mock Draft",
  "Trade Analyzer",
  "Fantasy Football Intelligence",
  "Start/Sit",
  "Waivers",
  "Trades",
  "Lineup",
  "Watch",
  "Analysts",
  "League",
  'page==="Players"'
]) {
  if (!app.includes(token)) throw new Error(`Missing product contract: ${token}`);
}

if (/●|•|type=["']radio["']|role=["']radio["']/i.test(app)) {
  throw new Error("Dot/radio selection indicator survived in native app.");
}

console.log("Native Shiva mobile shell verification passed.");
