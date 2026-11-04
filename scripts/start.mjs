import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const isWindows = process.platform === "win32";

const standaloneDir = path.join(root, ".next", "standalone");
const standaloneServer = path.join(standaloneDir, "server.js");
const hasStandalone = fs.existsSync(standaloneServer);

if (hasStandalone) {
  const staticSrc = path.join(root, ".next", "static");
  const staticDest = path.join(standaloneDir, ".next", "static");
  const publicSrc = path.join(root, "public");
  const publicDest = path.join(standaloneDir, "public");

  try {
    if (fs.existsSync(staticSrc)) {
      fs.mkdirSync(path.dirname(staticDest), { recursive: true });
      fs.cpSync(staticSrc, staticDest, { recursive: true, force: true });
    }
    if (fs.existsSync(publicSrc)) {
      fs.cpSync(publicSrc, publicDest, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn("Could not copy static assets to standalone directory:", err);
  }
}

// In production (e.g. Railway), traffic is routed to the public PORT.
// The Todobee server acts as the primary gateway on publicPort, serving /api directly
// and proxying all frontend routes to Next.js running on an internal port.
const publicPort = String(process.env.PORT || "3000");
// Choose an internal Next.js port that never collides with publicPort
const nextInternalPort = publicPort === "3000" ? "3001" : "3000";

function run(command, cwd, extraEnv = {}) {
  const child = spawn(command, {
    cwd,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
  child.on("exit", (code) => {
    if (code) {
      console.error(`Process exited with code ${code}: ${command}`);
      stop(code);
    }
  });
  return child;
}

const children = [];
let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    try {
      if (isWindows && child.pid) {
        execSync(`taskkill /pid ${child.pid} /f /t`, { stdio: "ignore" });
      } else if (child.pid) {
        child.kill("SIGTERM");
      }
    } catch {
      // ignore
    }
  }
  process.exit(exitCode);
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

console.log(`Starting Next.js frontend internally on port ${nextInternalPort}...`);
if (hasStandalone) {
  children.push(
    run("node server.js", standaloneDir, {
      PORT: nextInternalPort,
      HOSTNAME: "127.0.0.1",
      API_INTERNAL_URL: `http://127.0.0.1:${publicPort}`,
    })
  );
} else {
  children.push(
    run(`npx next start -p ${nextInternalPort} -H 127.0.0.1`, root, {
      PORT: nextInternalPort,
      API_INTERNAL_URL: `http://127.0.0.1:${publicPort}`,
    })
  );
}

console.log(`Starting Todobee API gateway on public port ${publicPort}...`);
children.push(
  run("npm run start", path.join(root, "server"), {
    PORT: publicPort,
    PROXY_NEXT: "1",
    NEXT_ORIGIN: `http://127.0.0.1:${nextInternalPort}`,
  })
);

