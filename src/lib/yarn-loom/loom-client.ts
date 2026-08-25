import { LOOM_NEED_BITMAP, type LoomRequest, type LoomResponse } from "./loom-protocol";
import type { PackedStitches } from "./pack";
import type { WeaveParams } from "./weave";

type Pending = {
  resolve: (packed: PackedStitches) => void;
  reject: (error: Error) => void;
};

type Queued = {
  req: LoomRequest;
  transfer: Transferable[];
  resolve: (packed: PackedStitches) => void;
  reject: (error: Error) => void;
};

export class LoomSupersededError extends Error {
  readonly superseded = true;
  constructor() {
    super("Loom job superseded");
    this.name = "LoomSupersededError";
  }
}

export function isLoomSuperseded(error: unknown): boolean {
  return (
    error instanceof LoomSupersededError ||
    (typeof error === "object" &&
      error !== null &&
      "superseded" in error &&
      (error as { superseded: unknown }).superseded === true)
  );
}

export class LoomClient {
  private worker: Worker | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;
  private busy = false;
  private queued: Queued | null = null;
  private lastSourceKey: string | null = null;

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL("./loom.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<LoomResponse>) => {
      const msg = event.data;
      const job = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      const next = this.queued;
      this.queued = null;
      if (next) {
        job?.reject(new LoomSupersededError());
        this.send(next);
      } else {
        this.busy = false;
        if (!job) return;
        if (msg.ok) job.resolve(msg.packed);
        else job.reject(new Error(msg.error));
      }
    };
    worker.onerror = (event) => {
      const error = new Error(event.message || "Loom worker failed");
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
      if (this.queued) {
        this.queued.req.bitmap?.close();
        this.queued.reject(error);
        this.queued = null;
      }
      this.busy = false;
      this.lastSourceKey = null;
    };
    this.worker = worker;
    return worker;
  }

  weaveCourtyard(
    sourceKey: string,
    params: WeaveParams,
    maxW = 420,
  ): Promise<PackedStitches> {
    return this.enqueue({
      kind: "courtyard",
      sourceKey,
      params,
      maxW,
    });
  }

  async weaveImage(
    sourceKey: string,
    params: WeaveParams,
    getBitmap: () => Promise<ImageBitmap>,
    maxW = 400,
  ): Promise<PackedStitches> {
    const needBitmap = this.lastSourceKey !== sourceKey;
    try {
      return await this.enqueue({
        kind: "image",
        sourceKey,
        params,
        maxW,
        bitmap: needBitmap ? await getBitmap() : undefined,
      });
    } catch (error) {
      if (isLoomSuperseded(error)) throw error;
      if (!(error instanceof Error) || error.message !== LOOM_NEED_BITMAP) {
        throw error;
      }
      this.lastSourceKey = null;
      return this.enqueue({
        kind: "image",
        sourceKey,
        params,
        maxW,
        bitmap: await getBitmap(),
      });
    }
  }

  private enqueue(body: Omit<LoomRequest, "id">): Promise<PackedStitches> {
    const id = this.nextId++;
    const req: LoomRequest = { ...body, id };
    const transfer: Transferable[] = req.bitmap ? [req.bitmap] : [];

    return new Promise((resolve, reject) => {
      if (this.busy) {
        this.dropQueued();
        this.queued = { req, transfer, resolve, reject };
        return;
      }
      this.send({ req, transfer, resolve, reject });
    });
  }

  private dropQueued() {
    if (!this.queued) return;
    this.queued.req.bitmap?.close();
    this.queued.reject(new LoomSupersededError());
    this.queued = null;
  }

  private send(job: Queued) {
    this.busy = true;
    if (job.req.bitmap || job.req.kind === "courtyard") {
      this.lastSourceKey = job.req.sourceKey;
    }
    this.pending.set(job.req.id, {
      resolve: job.resolve,
      reject: job.reject,
    });
    this.ensureWorker().postMessage(job.req, job.transfer);
  }

  terminate(): void {
    for (const job of this.pending.values()) {
      job.reject(new Error("Loom worker terminated"));
    }
    this.pending.clear();
    this.dropQueued();
    this.busy = false;
    this.lastSourceKey = null;
    this.worker?.terminate();
    this.worker = null;
  }
}
