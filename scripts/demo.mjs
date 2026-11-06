import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const demo = path.join(root, "demo");
const linkKind = process.platform === "win32" ? "junction" : "dir";

function link(target: string, dest: string) {
  if (fs.existsSync(dest)) return;
  fs.symlinkSync(target, dest, linkKind);
}

link(path.join(root, "public"), path.join(demo, "public"));
link(path.join(root, "node_modules"), path.join(demo, "node_modules"));

const nextBin = path.join(demo, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, "dev", "--port", "5000", "-H", "0.0.0.0"], {
  cwd: demo,
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_DEMO: "1" },
});

child.on("exit", (code) => process.exit(code ?? 0));
