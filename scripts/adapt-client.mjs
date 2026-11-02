import fs from "node:fs";
import path from "node:path";

const root = path.resolve("client/src");

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

function stripRoute(src) {
  const token = "export const Route = createFileRoute";
  const start = src.indexOf(token);
  if (start < 0) return src;
  let i = start;
  let depth = 0;
  let seenBrace = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "{") {
      depth++;
      seenBrace = true;
    } else if (c === "}") {
      depth--;
      if (seenBrace && depth === 0) {
        const rest = src.slice(i + 1);
        const semi = rest.match(/^\s*;/);
        const end = i + 1 + (semi ? semi[0].length : 0);
        return src.slice(0, start) + src.slice(end);
      }
    }
  }
  return src;
}

function rewriteRouterImport(src) {
  return src.replace(/import\s*\{([^}]+)\}\s*from\s*"@tanstack\/react-router";?/g, (_, names) => {
    const keep = names
      .split(",")
      .map((s) => s.trim())
      .filter((n) => n === "Link" || n === "useNavigate" || n === "useRouterState");
    if (!keep.length) return "";
    return `import { ${keep.join(", ")} } from "@/lib/nav";`;
  });
}

const exportFns = [
  "LandingPage",
  "SubscribePage",
  "Dashboard",
  "MyTasks",
  "ProjectBoard",
  "ProjectsPage",
  "UsersPage",
  "SettingsPage",
];

for (const file of walk(root)) {
  let src = fs.readFileSync(file, "utf8");
  const next = rewriteRouterImport(src);
  if (next !== src) {
    src = next;
    fs.writeFileSync(file, src);
  }
}

for (const file of walk(path.join(root, "views"))) {
  let src = fs.readFileSync(file, "utf8");
  src = stripRoute(src);
  src = src.replace(/^import type \{[^}]*\}\s*from\s*"@tanstack\/react-router";\r?\n/m, "");
  for (const name of exportFns) {
    src = src.replace(new RegExp(`(?<!export )function ${name}\\(`), `export function ${name}(`);
  }
  if (!src.startsWith('"use client"') && !src.startsWith("'use client'")) {
    src = `"use client";\n${src}`;
  }
  fs.writeFileSync(file, src);
}

const cssSrc = path.resolve("RefCode/src/styles.css");
let css = fs.readFileSync(cssSrc, "utf8");
css = css.replace(
  `@import "tailwindcss" source(none);\n@source "../src";\n@import "tw-animate-css";`,
  `@import "tailwindcss" source(none);\n@source "..";\n@import "tw-animate-css";`,
);
fs.mkdirSync(path.resolve("client/src/app"), { recursive: true });
fs.writeFileSync(path.resolve("client/src/app/globals.css"), css);

for (const file of fs.readdirSync(path.resolve("client/src/assets"))) {
  if (!file.endsWith(".json")) continue;
  const p = path.resolve("client/src/assets", file);
  const json = JSON.parse(fs.readFileSync(p, "utf8"));
  if (file.includes("marketing-board")) json.url = "/brand/board.svg";
  else if (file.includes("dark")) json.url = "/brand/bee-dark.png";
  else json.url = "/brand/bee-light.png";
  fs.writeFileSync(p, JSON.stringify(json, null, 2) + "\n");
}

console.log("adapted");
