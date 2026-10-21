// Small real child used by the supervisor tests; not application code.
const http = require("node:http");
if (process.argv.includes("--crash")) process.exit(7);
const server = http.createServer((_request, response) => response.end("ok"));
function stop() { server.close(() => process.exit(0)); }
if (process.argv.includes("--ipc")) {
  process.on("message", message => { if (message?.type === "shutdown") stop(); });
  process.on("disconnect", stop);
} else {
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", data => { if (data.includes("shutdown")) stop(); });
  process.stdin.on("end", stop);
}
server.listen(0, "127.0.0.1", () => console.log(JSON.stringify({ port: server.address().port })));
