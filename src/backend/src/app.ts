import { Server } from "./server.js";

async function main() {
  const server = new Server();

  try {
    await server.listen();
  } catch (err) {
    server.app.log.error(err);
    process.exit(1);
  }
}

main();
