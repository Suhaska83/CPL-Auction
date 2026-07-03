import { createServer } from "node:http";
import next from "next";
import { Server as IOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));

  const io = new IOServer(httpServer, {
    cors: { origin: "*" },
    path: "/socket.io"
  });

  // Expose io globally so API routes can broadcast
  (globalThis as unknown as { io: IOServer }).io = io;

  io.on("connection", (socket) => {
    // eslint-disable-next-line no-console
    console.log(`⚡ socket connected: ${socket.id}`);
    socket.on("disconnect", () => {
      // eslint-disable-next-line no-console
      console.log(`👋 socket disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, hostname, () => {
    // eslint-disable-next-line no-console
    console.log(`▶  CPLAuction ready at http://${hostname}:${port}`);
  });
});
