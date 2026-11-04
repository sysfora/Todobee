import { spawn, execSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(".");

function run(command, cwd) {
  const child = spawn(command, { cwd, stdio: "inherit", shell: true });
  child.on("exit", (code) => {
    if (code) {
      console.error(`${command} exited ${code}`);
      process.exit(code);
    }
  });
  return child;
}

const children = [];
const stop = () => {
  for (const child of children) {
    try {
      if (process.platform === "win32" && child.pid) {
        execSync(`taskkill /pid ${child.pid} /f /t`, { stdio: "ignore" });
      } else {
        child.kill();
      }
    } catch {
      // ignore errors if process is already dead
    }
  }
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

children.push(run("npm run dev", path.join(root, "server")));
children.push(run("npx next dev --port 3000", root));
