// Run the standard Next CLI with an explicit parent-owned shutdown channel.
// Do not forward terminal stdin; interactive prompts are not the supervisor.
const path = require("node:path");
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  if (!process.emit("SIGTERM", "SIGTERM")) process.exitCode = 0;
  if (process.connected) process.disconnect();
}
process.on("message", message => { if (message?.type === "shutdown") stop(); });
process.on("disconnect", stop);
const root = process.argv[2];
const cli = path.join(root, "node_modules/next/dist/bin/next");
process.argv = [process.execPath, cli, "dev", "--port", "3000"];
require(cli);
// The control channel must not keep a failed/finished Next CLI alive by itself.
process.channel?.unref();
