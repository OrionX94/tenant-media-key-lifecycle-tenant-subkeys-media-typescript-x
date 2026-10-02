import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { z } from "zod";
import { InfraiError, infraiFromEnvironment } from "./infrai_client.ts";
import { MediaWorkflow } from "./media_workflow.ts";
import { TenantAccounts } from "./tenant_accounts.ts";

const tenants = new TenantAccounts(infraiFromEnvironment());
const media = new MediaWorkflow();

const onboardBody = z.object({
  tenantId: z.string().min(1), email: z.string().email(), name: z.string().min(1),
}).strict();
const ingestBody = z.object({ sourceUrl: z.string().url(), title: z.string().min(1) }).strict();
const jobBody = z.object({
  assetId: z.string().uuid(), preset: z.enum(["streaming-1080p", "audio-only"]),
}).strict();
const deliveryBody = z.object({ assetId: z.string().uuid(), creatorEmail: z.string().email() }).strict();

async function jsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}

async function route(request: IncomingMessage, response: ServerResponse) {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);

  if (method === "POST" && url.pathname === "/tenants") {
    const input = onboardBody.parse(await jsonBody(request));
    const result = await tenants.onboard(input);
    send(response, 201, {
      tenant: result.account,
      key: result.key,
      keyNotice: "Store this plaintext key now; it cannot be retrieved again.",
    });
    return;
  }

  const tenantId = parts[1];
  if (parts[0] !== "tenants" || !tenantId) {
    send(response, 404, { error: "Route not found" });
    return;
  }

  if (method === "DELETE" && parts.length === 2) {
    send(response, 200, await tenants.offboard(tenantId));
  } else if (method === "POST" && parts[2] === "assets" && parts.length === 3) {
    send(response, 201, media.ingest(tenantId, ingestBody.parse(await jsonBody(request))));
  } else if (method === "POST" && parts[2] === "jobs" && parts.length === 3) {
    const input = jobBody.parse(await jsonBody(request));
    send(response, 201, media.queue(tenantId, input.assetId, input.preset));
  } else if (method === "POST" && parts[2] === "jobs" && parts[4] === "complete") {
    send(response, 200, media.complete(tenantId, parts[3] ?? ""));
  } else if (method === "POST" && parts[2] === "deliveries" && parts.length === 3) {
    const input = deliveryBody.parse(await jsonBody(request));
    send(response, 201, media.deliver(tenantId, input.assetId, input.creatorEmail));
  } else {
    send(response, 404, { error: "Route not found" });
  }
}

const server = createServer((request, response) => {
  route(request, response).catch((error: unknown) => {
    if (error instanceof z.ZodError) {
      send(response, 400, { error: "Invalid request body", issues: error.issues });
    } else if (error instanceof InfraiError) {
      send(response, error.status >= 400 && error.status < 500 ? error.status : 502, {
        error: error.code, message: error.message,
      });
    } else {
      send(response, 409, { error: error instanceof Error ? error.message : "Request failed" });
    }
  });
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Media tenant service listening on http://localhost:${port}`));
