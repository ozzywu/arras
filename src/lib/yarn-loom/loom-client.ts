import type { LoomRequest, LoomResponse } from "./loom-protocol";
import type { PackedStitches } from "./pack";
import type { WeaveParams } from "./weave";

type Pending = {
  resolve: (packed: PackedStitches) => void;
  reject: (error: Error) => void;
};

export class LoomClient {
  private worker: Worker | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL("./loom.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<LoomResponse>) => {
      const msg = event.data;
      const job = this.pending.get(msg.id);
      if (!job) return;
      this.pending.delete(msg.id);
      if (msg.ok) job.resolve(msg.packed);
      else job.reject(new Error(msg.error));
    };
    worker.onerror = (event) => {
      const error = new Error(event.message || "Loom worker failed");
      for (const job of this.pending.values()) job.reject(error);
      this.pending.clear();
    };
    this.worker = worker;
    return worker;
  }

  weaveCourtyard(params: WeaveParams, maxW = 420): Promise<PackedStitches> {
    const id = this.nextId++;
    const req: LoomRequest = { id, kind: "courtyard", params, maxW };
    return this.post(req);
  }

  weaveBitmap(
    bitmap: ImageBitmap,
    params: WeaveParams,
    maxW = 400,
  ): Promise<PackedStitches> {
    const id = this.nextId++;
    const req: LoomRequest = { id, kind: "image", params, maxW, bitmap };
    return this.post(req, [bitmap]);
  }

  private post(req: LoomRequest, transfer: Transferable[] = []): Promise<PackedStitches> {
    return new Promise((resolve, reject) => {
      this.pending.set(req.id, { resolve, reject });
      this.ensureWorker().postMessage(req, transfer);
    });
  }

  terminate(): void {
    for (const job of this.pending.values()) {
      job.reject(new Error("Loom worker terminated"));
    }
    this.pending.clear();
    this.worker?.terminate();
    this.worker = null;
  }
}
