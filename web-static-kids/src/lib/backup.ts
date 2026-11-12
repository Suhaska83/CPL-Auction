import { get, ref, set } from "firebase/database";
import { getFirebase } from "@/firebase";

// Nodes safe to back up / restore (excludes /admins to avoid locking anyone out).
const NODES = ["tournament", "teams", "players", "state", "bids"] as const;
type Node = (typeof NODES)[number];

export interface Backup {
  version: 1;
  exportedAt: number;
  data: Partial<Record<Node, unknown>>;
}

export async function exportBackup(): Promise<Backup> {
  const { db } = getFirebase();
  const data: Backup["data"] = {};
  for (const node of NODES) {
    const s = await get(ref(db, node));
    data[node] = s.val();
  }
  return { version: 1, exportedAt: Date.now(), data };
}

export function downloadJson(name: string, obj: unknown) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<{ restored: Node[] }> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Backup;
  if (parsed.version !== 1 || !parsed.data) {
    throw new Error("Not a valid CPLAuction backup file (missing version 1 / data).");
  }
  const { db } = getFirebase();
  const restored: Node[] = [];
  for (const node of NODES) {
    if (parsed.data[node] !== undefined) {
      await set(ref(db, node), parsed.data[node]);
      restored.push(node);
    }
  }
  return { restored };
}
