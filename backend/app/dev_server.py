"""Uvicorn development process with a dedicated supervisor control pipe."""
import sys
from threading import Thread
import uvicorn


def main():
    server = uvicorn.Server(uvicorn.Config("app.main:app", host="127.0.0.1", port=8000, timeout_graceful_shutdown=8))

    def watch_parent():
        for command in sys.stdin:
            if command.strip() == "shutdown":
                break
        # EOF here means the supervisor's private pipe closed, not keyboard EOF.
        server.should_exit = True

    Thread(target=watch_parent, daemon=True, name="bolo-dev-control").start()
    server.run()


if __name__ == "__main__":
    main()
