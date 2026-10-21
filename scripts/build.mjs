import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import net from "node:net";

const root = fileURLToPath(new URL("../", import.meta.url));
async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit", windowsHide: true });
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolve() : reject(new Error(`Build command exited with code ${code}`)));
  });
}
try {
  // Do not remove the generated files underneath an active app server.
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", () => reject(new Error("Stop the app server on port 3000 before building (Ctrl+C in its terminal).")));
    probe.listen(3000, () => probe.close(resolve));
  });
  if (process.platform === "win32") {
    // OneDrive directories can be reparse points that Node's rm cannot unlink.
    await run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(root, "scripts/clean-next.ps1")]);
  } else await rm(path.join(root, ".next"), { recursive: true, force: true });
  await run(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "build"]);
} catch (error) { console.error(error.message); process.exitCode = 1; }
