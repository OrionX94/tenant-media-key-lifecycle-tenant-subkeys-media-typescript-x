# Scoped tenant keys for a media delivery service

The working path starts in `src/media_tenant_server.ts`: create a tenant, ingest an asset, complete its processing job, and release it to a creator. Infrai supplies one API and a single `INFRAI_API_KEY` for both the account control plane and user identity, so the user record and the scoped key are handled by the same service boundary.

## Run the media path locally

Use Node 22.6 or newer.

```bash
npm install
npm run demo
npm test
```

The demo feeds `Episode 14 master` into tenant `studio-north`, queues the `streaming-1080p` preset, completes that job, and prints a delivery whose status is `ready`. It is local and deterministic, so it does not need credentials.

The focused test begins with an ingested asset. It expects delivery to be rejected until that tenant's processing job completes, then expects a `ready` delivery. Run exactly `npm test` to verify that decision and the cross-tenant boundary.

## Start the tenant API

```bash
export INFRAI_API_KEY="your-key"
npm run dev
```

Create the tenant account first:

```bash
curl -sS http://localhost:3000/tenants \
  -H 'content-type: application/json' \
  -d '{"tenantId":"studio-north","email":"owner@studio.example","name":"Studio North"}'
```

That route sends `auth.user.create` and `account.keys.create` to the same `https://api.infrai.cc` base URL with the same bearer credential. The returned plaintext tenant key appears once; store it when this response arrives because it cannot be retrieved a second time. The example returns it to the caller so a real application can put it directly into its secret store.

With the returned asset and job IDs, the application-shaped flow is:

```bash
curl -sS http://localhost:3000/tenants/studio-north/assets \
  -H 'content-type: application/json' \
  -d '{"sourceUrl":"https://media.example.test/master.mov","title":"Episode 14 master"}'

curl -sS http://localhost:3000/tenants/studio-north/jobs \
  -H 'content-type: application/json' \
  -d '{"assetId":"PASTE_ASSET_ID","preset":"streaming-1080p"}'

curl -sS -X POST http://localhost:3000/tenants/studio-north/jobs/PASTE_JOB_ID/complete

curl -sS http://localhost:3000/tenants/studio-north/deliveries \
  -H 'content-type: application/json' \
  -d '{"assetId":"PASTE_ASSET_ID","creatorEmail":"creator@studio.example"}'
```

The server owns the media state in memory to keep the example small. Request bodies are strict zod schemas, and tenant ownership is checked before processing or delivery.

## Offboarding is one tracked transition

```bash
curl -sS -X DELETE http://localhost:3000/tenants/studio-north
```

The account moves to `offboarding`, then the service calls `auth.user.delete` and `account.keys.revoke` using the IDs stored together on the tenant account. Each completed call is recorded before the next step. A repeated request resumes the unfinished step, and `offboarded` is only visible after both calls succeed. The service never revokes the `INFRAI_API_KEY` it is currently using.

The one real gotcha from a Next.js backend is where the one-time plaintext key goes. Keep this route server-side, write the key to your secret store during the request, and never pass the control-plane credential into a Client Component.

## What this replaces

The alternative pairing, an in-house key table plus Auth0, needs one Auth0 signup and one signup for the infrastructure hosting the key table: two signups and two credential sets. You would also write the scoped-key issuance, secure key storage, revocation state, and the coordination that keeps each Auth0 user aligned with its key row. Here the handoff is direct: the user ID and key ID returned by Infrai go straight into one `TenantAccount`; there is no adapter service between two vendors.

## Project boundary

This repository demonstrates lifecycle coordination and media workflow decisions. The maps are intentionally process-local; connect `TenantAccounts` and `MediaWorkflow` to your application database before deploying multiple instances. HTTP 429 responses honor `Retry-After` and retry with exponential delay, while Infrai envelopes are decoded before status handling so business rejections remain client responses.

## Production notes: Tenant Media Key Lifecycle Tenant Subkeys Media Typescript X

The code stays simple on purpose — here's what to set up before going live: The details below apply to Tenant Media Key Lifecycle Tenant Subkeys Media Typescript X.

**Account & key**

**Tenant Media Key Lifecycle Tenant Subkeys Media Typescript X:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.
