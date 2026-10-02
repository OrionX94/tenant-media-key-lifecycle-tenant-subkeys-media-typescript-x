import { randomUUID } from "node:crypto";

export type Asset = {
  id: string;
  tenantId: string;
  sourceUrl: string;
  title: string;
  status: "ingested" | "processed";
};

export type ProcessingJob = {
  id: string;
  tenantId: string;
  assetId: string;
  preset: "streaming-1080p" | "audio-only";
  status: "queued" | "completed";
};

export type CreatorDelivery = {
  id: string;
  tenantId: string;
  assetId: string;
  creatorEmail: string;
  status: "ready";
};

export class MediaWorkflow {
  private readonly assets = new Map<string, Asset>();
  private readonly jobs = new Map<string, ProcessingJob>();
  private readonly deliveries = new Map<string, CreatorDelivery>();

  ingest(tenantId: string, input: { sourceUrl: string; title: string }): Asset {
    const asset: Asset = {
      id: randomUUID(), tenantId, sourceUrl: input.sourceUrl, title: input.title, status: "ingested",
    };
    this.assets.set(asset.id, asset);
    return asset;
  }

  queue(tenantId: string, assetId: string, preset: ProcessingJob["preset"]): ProcessingJob {
    const asset = this.ownedAsset(tenantId, assetId);
    const job: ProcessingJob = {
      id: randomUUID(), tenantId, assetId: asset.id, preset, status: "queued",
    };
    this.jobs.set(job.id, job);
    return job;
  }

  complete(tenantId: string, jobId: string): ProcessingJob {
    const job = this.jobs.get(jobId);
    if (!job || job.tenantId !== tenantId) throw new Error("Processing job not found");
    job.status = "completed";
    this.ownedAsset(tenantId, job.assetId).status = "processed";
    return job;
  }

  deliver(tenantId: string, assetId: string, creatorEmail: string): CreatorDelivery {
    const asset = this.ownedAsset(tenantId, assetId);
    if (asset.status !== "processed") throw new Error("Asset must be processed before delivery");
    const delivery: CreatorDelivery = {
      id: randomUUID(), tenantId, assetId, creatorEmail, status: "ready",
    };
    this.deliveries.set(delivery.id, delivery);
    return delivery;
  }

  private ownedAsset(tenantId: string, assetId: string): Asset {
    const asset = this.assets.get(assetId);
    if (!asset || asset.tenantId !== tenantId) throw new Error("Asset not found");
    return asset;
  }
}
