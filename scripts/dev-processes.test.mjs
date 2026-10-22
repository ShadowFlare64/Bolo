import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { EventEmitter } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DevProcesses } from "./dev-processes.mjs";

test("Next CLI forks are hidden on Windows without changing their arguments or shutdown channel", () => {
  const calls = [];
  const result = {};
  const childProcess = { fork: (...args) => { calls.push(args); return result; } };
  const wrapperProcess = new EventEmitter();
  let disconnects = 0;
  let terminations = 0;
  let unrefs = 0;
  Object.assign(wrapperProcess, {
    platform: "win32", execPath: process.execPath, argv: [process.execPath, "wrapper", "example-project"],
    connected: true, disconnect() { disconnects++; this.connected = false; },
    channel: { unref() { unrefs++; } },
  });
  wrapperProcess.on("SIGTERM", () => { terminations++; });
  const options = { stdio: "inherit", env: { EXAMPLE: "preserved" }, execArgv: ["--enable-source-maps"] };
  let cliLoaded = false;
  runInNewContext(readFileSync(new URL("./next-process.cjs", import.meta.url), "utf8"), {
    process: wrapperProcess,
    require(id) {
      if (id === "node:path") return path;
      if (id === "node:child_process") return childProcess;
      assert.equal(id, path.join("example-project", "node_modules/next/dist/bin/next"));
      cliLoaded = true;
      assert.equal(childProcess.fork("server.cjs", options), result);
      childProcess.fork("server.cjs", ["argument"], options);
      childProcess.fork("server.cjs", undefined, options);
    },
  });
  assert.equal(cliLoaded, true);
  for (const [, , received] of calls) {
    assert.equal(received.windowsHide, true);
    for (const key of ["stdio", "env", "execArgv"]) assert.equal(received[key], options[key]);
  }
  assert.equal(calls[1][1][0], "argument");
  assert.equal(options.windowsHide, undefined, "Caller options must not be mutated");
  assert.deepEqual(Array.from(wrapperProcess.argv).slice(2), ["dev", "--port", "3000"]);
  assert.equal(terminations, 0, "Loading the CLI must not request shutdown");
  wrapperProcess.emit("message", { type: "shutdown" });
  wrapperProcess.emit("disconnect");
  assert.equal(terminations, 1);
  assert.equal(disconnects, 1);
  assert.equal(unrefs, 1);
});

const fixture = fileURLToPath(new URL("./fixtures/dev-service.cjs", import.meta.url));
const pythonw = fileURLToPath(new URL("../backend/.venv/Scripts/pythonw.exe", import.meta.url));
test("Windows no-console Python preserves stdout, stderr and failure diagnostics", {
  skip: process.platform !== "win32" || !existsSync(pythonw), timeout: 10000,
}, async () => {
  const failures = [];
  const supervisor = new DevProcesses(message => failures.push(message));
  const child = supervisor.start("Python diagnostic probe", pythonw, ["-c",
    "import sys; print('stdout probe', flush=True); print('stderr probe', file=sys.stderr, flush=True); sys.exit(7)",
  ]);
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", data => { stdout += data; });
  child.stderr.on("data", data => { stderr += data; });
  try {
    await once(child, "close");
    assert.match(stdout, /stdout probe/);
    assert.match(stderr, /stderr probe/);
    assert.match(failures[0], /Python diagnostic probe exited unexpectedly \(code=7/);
    assert.equal(supervisor.records.length, 1);
  } finally { await supervisor.shutdown(); }
});

for (const ipc of [false, true]) {
  test(`server survives requests and idle; shuts down over ${ipc ? "IPC" : "stdin control pipe"}`, { timeout: 15000 }, async () => {
    const failures = [];
    const supervisor = new DevProcesses(message => failures.push(message));
    const child = supervisor.start("test server", process.execPath, [fixture, ...(ipc ? ["--ipc"] : [])], { ipc });
    try {
      const [data] = await once(child.stdout, "data");
      const { port } = JSON.parse(data.toString());
      for (let i = 0; i < 3; i++) assert.equal(await (await fetch(`http://127.0.0.1:${port}`)).text(), "ok");
      await new Promise(resolve => setTimeout(resolve, 500));
      assert.equal(child.exitCode, null);
      await supervisor.shutdown();
      assert.equal(child.exitCode, 0);
      assert.deepEqual(failures, []);
      assert.throws(() => supervisor.start("late server", process.execPath, [fixture]), /shutdown/);
    } finally { await supervisor.shutdown(); }
  });
}

test("unexpected process failure is reported with exit code, without restarting", { timeout: 10000 }, async () => {
  let report;
  const reported = new Promise(resolve => { report = resolve; });
  const supervisor = new DevProcesses(report);
  supervisor.start("crashing server", process.execPath, [fixture, "--crash"]);
  const message = await reported;
  assert.match(message, /crashing server exited unexpectedly \(code=7/);
  assert.equal(supervisor.records.length, 1);
  await supervisor.shutdown();
});
