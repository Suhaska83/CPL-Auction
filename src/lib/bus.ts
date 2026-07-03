// Access the Socket.IO server initialised in server.ts (attached to globalThis).
import type { Server as IOServer } from "socket.io";

export function getIO(): IOServer | null {
  return (globalThis as unknown as { io?: IOServer }).io ?? null;
}

export type AuctionEvent =
  | { type: "state"; payload: unknown }
  | { type: "bid"; payload: unknown }
  | { type: "sold"; payload: unknown }
  | { type: "unsold"; payload: unknown }
  | { type: "next"; payload: unknown };

export function broadcast(event: string, payload: unknown) {
  const io = getIO();
  if (!io) return;
  io.emit(event, payload);
}
