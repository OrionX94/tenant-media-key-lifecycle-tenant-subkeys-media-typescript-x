import assert from "node:assert/strict";
import test from "node:test";
import { MediaWorkflow } from "./media_workflow.ts";

test("delivery waits for the tenant's processing job", () => {
  const workflow = new MediaWorkflow();
  const asset = workflow.ingest("studio-north", {
    sourceUrl: "https://media.example.test/master.mov",
    title: "Episode 14 master",
  });

  assert.throws(
    () => workflow.deliver("studio-north", asset.id, "creator@example.test"),
    /must be processed/,
  );

  const job = workflow.queue("studio-north", asset.id, "streaming-1080p");
  workflow.complete("studio-north", job.id);
  const delivery = workflow.deliver("studio-north", asset.id, "creator@example.test");

  assert.equal(delivery.status, "ready");
  assert.equal(delivery.assetId, asset.id);
});

test("a tenant cannot process another tenant's asset", () => {
  const workflow = new MediaWorkflow();
  const asset = workflow.ingest("studio-north", {
    sourceUrl: "https://media.example.test/master.mov",
    title: "Episode 14 master",
  });

  assert.throws(() => workflow.queue("studio-south", asset.id, "audio-only"), /not found/);
});
