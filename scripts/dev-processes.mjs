import { spawn } from "node:child_process";

// Only the launcher owns console input. Servers get dedicated control pipes.
export class DevProcesses {
  constructor(onFailure, { shutdownTimeout = 10000 } = {}) {
    this.onFailure = onFailure;
    this.shutdownTimeout = shutdownTimeout;
    this.records = [];
    this.stopping = false;
  }

  start(name, command, args, { cwd, ipc = false } = {}) {
    if (this.stopping) throw new Error("Cannot start a server while shutdown is in progress.");
    const child = spawn(command, args, {
      cwd,
      stdio: ipc ? ["pipe", "pipe", "pipe", "ipc"] : ["pipe", "pipe", "pipe"],
      // Prevent a Windows console event from being delivered independently to
      // npm, this launcher, Python, and Next. Shutdown has one explicit owner.
      detached: process.platform === "win32",
      windowsHide: true,
    });
    child.stdout.pipe(process.stdout, { end: false });
    child.stderr.pipe(process.stderr, { end: false });
    const record = { name, child, ipc, exited: false };
    record.done = new Promise(resolve => {
      child.once("error", error => {
        record.exited = true;
        resolve();
        if (!this.stopping) this.onFailure(`${name} failed to start: ${error.message}`);
      });
      child.once("exit", (code, signal) => {
        record.exited = true;
        if (!this.stopping) this.onFailure(`${name} exited unexpectedly (code=${code}, signal=${signal ?? "none"}, pid=${child.pid}).`);
      });
      child.once("close", resolve);
    });
    // EPIPE can happen when a server crashes while shutdown is being requested.
    child.stdin.on("error", error => {
      if (!this.stopping && !record.exited) this.onFailure(`${name} control pipe failed: ${error.message}`);
    });
    this.records.push(record);
    return child;
  }

  async shutdown() {
    if (this.stopping) return;
    this.stopping = true;
    await Promise.all(this.records.map(async record => {
      if (record.exited) return;
      const { child } = record;
      if (record.ipc && child.connected) child.send({ type: "shutdown" }, () => {});
      else if (!child.stdin.destroyed) child.stdin.end("shutdown\n");
      let timer;
      const graceful = await Promise.race([
        record.done.then(() => true),
        new Promise(resolve => { timer = setTimeout(() => resolve(false), this.shutdownTimeout); }),
      ]);
      clearTimeout(timer);
      if (graceful) return;
      console.error(`${record.name} did not stop within ${this.shutdownTimeout}ms; terminating its process tree.`);
      if (process.platform === "win32") {
        await new Promise(resolve => {
          const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "inherit", windowsHide: true });
          killer.once("error", error => { console.error(error.message); resolve(); });
          killer.once("exit", resolve);
        });
      } else child.kill("SIGKILL");
      await record.done;
    }));
  }
}
