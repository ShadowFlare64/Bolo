// One terminal owns both application servers. PostgreSQL data stays untouched.
import { spawn } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import net from "node:net";
import { DevProcesses } from "./dev-processes.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const backend = path.join(root, "backend");
const python = path.join(backend, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const children = new Set();
let stopping = false;
let finish;
const lifetime = new Promise(resolve => { finish = resolve; });
const servers = new DevProcesses(reason => { void stop(reason, 1); });

async function stop(reason, code = 0) {
  if (stopping) return;
  stopping = true;
  console.log(`\nStopping Bolo: ${reason}`);
  await servers.shutdown();
  for (const child of children) {
    if (process.platform === "win32") {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
      killer.on("error", error => console.error(error.message));
    } else child.kill("SIGTERM");
  }
  process.exitCode = code;
  finish();
}
process.on("SIGINT", () => { void stop("received SIGINT (Ctrl+C)"); });
process.on("SIGTERM", () => { void stop("received SIGTERM"); });

function run(command, args, { cwd = root, capture = false } = {}) {
  if (stopping) throw new Error("Startup cancelled");
  const child = spawn(command, args, { cwd, stdio: capture ? ["ignore", "pipe", "inherit"] : ["ignore", "inherit", "inherit"], windowsHide: true });
  children.add(child);
  let output = "";
  if (capture) child.stdout.on("data", data => { output += data; });
  const done = new Promise((resolve, reject) => {
    child.on("error", error => { children.delete(child); reject(new Error(`Cannot launch ${path.basename(command)}: ${error.message}`)); });
    child.on("exit", code => {
      children.delete(child);
      if (code === 0 || stopping) resolve(output.trim());
      else reject(new Error(`${path.basename(command)} exited with code ${code}. See the error above.`));
    });
  });
  return done;
}

async function requireFreePort(port) {
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", () => reject(new Error(`Port ${port} is already in use. Stop the previous Bolo server before running npm run dev.`)));
    probe.listen(port, () => probe.close(resolve));
  });
}

async function waitFor(url, timeout = 90000) {
  const end = Date.now() + timeout;
  while (!stopping && Date.now() < end) {
    try { if ((await fetch(url, { signal: AbortSignal.timeout(3000) })).ok) return; } catch { /* Server is starting. */ }
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  if (stopping) throw new Error("Startup cancelled");
  throw new Error(`Timed out waiting for ${url}. Check the server output above.`);
}

try {
  if (!existsSync(python)) throw new Error("Python environment missing. Follow backend/README.md to create backend/.venv and install requirements-lock.txt.");
  if (!existsSync(path.join(root, "node_modules/next/dist/bin/next"))) throw new Error("Frontend dependencies missing. Run npm install first.");
  await requireFreePort(3000);
  await requireFreePort(8000);
  if (!existsSync(path.join(backend, ".env"))) {
    if (process.platform === "win32" && existsSync(path.join(root, ".tools/pgsql/bin/pg_ctl.exe"))) {
      // Copy the portable settings, never overwrite an existing user's config.
      copyFileSync(path.join(backend, ".env.portable.example"), path.join(backend, ".env"));
    } else copyFileSync(path.join(backend, ".env.example"), path.join(backend, ".env"));
  }
  const target = JSON.parse(await run(python, ["-c", "import json; from app.config import settings; from sqlalchemy.engine import make_url; u=make_url(settings.database_url); print(json.dumps({'host':u.host,'port':u.port or 5432}))"], { cwd: backend, capture: true }));
  if (["127.0.0.1", "localhost"].includes(target.host) && target.port === 55432 && process.platform === "win32") {
    console.log("\nStarting project-local PostgreSQL…");
    await run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(backend, "scripts/local-postgres.ps1")]);
  }
  console.log("\nPreparing database (preserving existing progress)…");
  await run(python, ["-m", "alembic", "upgrade", "head"], { cwd: backend });
  await run(python, ["-m", "app.seed"], { cwd: backend });
  console.log("\nStarting FastAPI…");
  servers.start("FastAPI", python, ["-m", "app.dev_server"], { cwd: backend });
  await waitFor("http://127.0.0.1:8000/ready");
  console.log("\nStarting Next.js…");
  if (stopping) throw new Error("Startup cancelled");
  servers.start("Next.js", process.execPath, [path.join(root, "scripts/next-process.cjs"), root], { cwd: root, ipc: true });
  await waitFor("http://localhost:3000");
  console.log("\nBolo is ready: http://localhost:3000\nAPI docs: http://127.0.0.1:8000/docs\nPress Ctrl+C to stop both app servers. PostgreSQL keeps running; your progress stays saved.\n");
  // Explicit lifetime: finishing startup is not finishing the development app.
  await lifetime;
} catch (error) {
  if (stopping) { await lifetime; }
  else {
    console.error(`\nBolo could not start: ${error.message}\nFor manual setup, see backend/README.md.`);
    await stop("startup failed", 1);
  }
}
