import { spawn } from "node:child_process";
import path from "node:path";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const root = path.resolve(".");

function run(command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: "inherit", shell: false });
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
  for (const child of children) child.kill();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

children.push(run(npm, ["run", "dev"], path.join(root, "server")));
children.push(run(npx, ["next", "dev", "--port", "3000"], root));
