import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { DevProcesses } from "./dev-processes.mjs";

const fixture = fileURLToPath(new URL("./fixtures/dev-service.cjs", import.meta.url));
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
