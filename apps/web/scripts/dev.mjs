import { createServer } from "node:net";
import { spawn } from "node:child_process";

async function isPortFree(port) {
  return new Promise((resolve) => {
    const server = createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, "::");
  });
}

async function start() {
  const preferredPort = 3000;
  const fallbackPort = 3002;
  const port = (await isPortFree(preferredPort)) ? preferredPort : fallbackPort;

  if (port !== preferredPort) {
    console.log(`[web] Port ${preferredPort} is in use, starting on ${fallbackPort}.`);
  }

  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const child = spawn(command, ["exec", "next", "dev", "--port", String(port)], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });

  child.on("error", (error) => {
    console.error("[web] Failed to start next dev:", error);
    process.exit(1);
  });
}

start();
