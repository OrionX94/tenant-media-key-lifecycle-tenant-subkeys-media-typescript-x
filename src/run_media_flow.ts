import { MediaWorkflow } from "./media_workflow.ts";

const workflow = new MediaWorkflow();
const tenantId = "studio-north";
const asset = workflow.ingest(tenantId, {
  sourceUrl: "https://media.example.test/master.mov",
  title: "Episode 14 master",
});
const job = workflow.queue(tenantId, asset.id, "streaming-1080p");
workflow.complete(tenantId, job.id);
const delivery = workflow.deliver(tenantId, asset.id, "creator@example.test");

console.log(JSON.stringify({ asset, job, delivery }, null, 2));
