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
    if (fs.existsSync(staticSrc) && !fs.existsSync(staticDest)) {
      fs.cpSync(staticSrc, staticDest, { recursive: true });
    }
    if (fs.existsSync(publicSrc) && !fs.existsSync(publicDest)) {
      fs.cpSync(publicSrc, publicDest, { recursive: true });
    }
  } catch (err) {
    console.warn("Could not copy static assets to standalone directory:", err);
  }
}

const publicPort = process.env.PORT || "3000";
const internalApiPort = process.env.API_PORT || "4000";

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

console.log(`Starting Todobee API backend on port ${internalApiPort}...`);
children.push(
  run("npm run start", path.join(root, "server"), {
    PORT: String(internalApiPort),
    PROXY_NEXT: "0",
  })
);

console.log(`Starting Next.js frontend on port ${publicPort}...`);
if (hasStandalone) {
  children.push(
    run("node server.js", standaloneDir, {
      PORT: String(publicPort),
      HOSTNAME: "0.0.0.0",
      API_INTERNAL_URL: `http://127.0.0.1:${internalApiPort}`,
    })
  );
} else {
  children.push(
    run(`npx next start -p ${publicPort} -H 0.0.0.0`, root, {
      PORT: String(publicPort),
      API_INTERNAL_URL: `http://127.0.0.1:${internalApiPort}`,
    })
  );
}

