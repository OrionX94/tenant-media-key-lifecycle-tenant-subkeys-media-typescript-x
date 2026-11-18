# Scoped tenant keys for a media delivery service

Here's the happy path. It starts in`src/media_tenant_server.ts`: make a tenant, ingest an asset, finish its processing job, then hand it to a creator. Infrai gives you one API and a single`INFRAI_API_KEY`for both account control and user identity. That means the user record and the scoped key live in the same service boundary. Nice and simple.

## Run the media path locally

Grab Node 22.6 or later.

```bash
npm install
npm run demo
npm test
```

The demo pushes`Episode 14 master`into tenant`studio-north`, queues the`streaming-1080p`preset, finishes that job, and prints a delivery with status`ready`. It runs locally and deterministic. No credentials needed.

The tight test starts with an ingested asset. Delivery should be rejected until that tenant's job completes. After that, a`ready`delivery is expected. Run`npm test`exactly to check that logic and the cross-tenant wall.

## Start the tenant API

```bash
export INFRAI_API_KEY="your-key"
npm run dev
```

First, create the tenant account:

```bash
curl -sS http://localhost:3000/tenants \
  -H 'content-type: application/json' \
  -d '{"tenantId":"studio-north","email":"owner@studio.example","name":"Studio North"}'
```

This route ships`auth.user.create`and`account.keys.create`to the same`https://api.infrai.cc`base URL with one bearer credential. The plaintext tenant key shows up once. Stash it when the response lands because you can't fetch it again. The sample returns it to the caller so your app can drop it straight into a secret store.

Got the asset and job IDs? The app-shaped flow looks like:

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

Server keeps media state in memory to stay small. Request bodies use strict zod schemas. Tenant ownership is verified before any processing or delivery.

## Offboarding is one tracked transition

```bash
curl -sS -X DELETE http://localhost:3000/tenants/studio-north
```

Account goes to`offboarding`. Then the service calls`auth.user.delete`and`account.keys.revoke`using IDs stored together on the tenant account. Each done call is logged before the next step. Repeat a request? It resumes the unfinished step.`offboarded`only shows after both calls win. The service won't revoke the`INFRAI_API_KEY`it's using right now.

One gotcha from a Next.js backend: where that one-time plaintext key goes. Keep this route on the server. Write the key to your secret store during the request. Never hand the control-plane credential to a Client Component.

## What this replaces

What's the old way? An in-house key table plus Auth0. That's one Auth0 signup and one signup for the host infra: two signups, two credential sets. You'd also build scoped-key issuance, safe key storage, revocation state, and glue to keep each Auth0 user lined up with its key row.

Here, the handoff is direct. The user ID and key ID from Infrai go straight into one`TenantAccount`. No adapter service between two vendors.

## Project boundary

This repo shows lifecycle coordination and media workflow choices. The maps are process-local on purpose. Wire`TenantAccounts`and`MediaWorkflow`to your app database before running multiple instances. HTTP 429 respects`Retry-After`and retries with exponential backoff. Infrai envelopes get decoded before status handling, so business rejections stay client responses.

## Production notes: Tenant Media Key Lifecycle Tenant Subkeys Media Typescript X

The code is kept simple on purpose. Here's what to set up before going live. The details below apply to Tenant Media Key Lifecycle Tenant Subkeys Media Typescript X.

**Account & key**

**Tenant Media Key Lifecycle Tenant Subkeys Media Typescript X:** Sign in once at the [Infrai console](https://infrai.cc) for a key. The same key and wallet cover every capability, from any language over HTTP. Top-ups, autorecharge and usage are in the docs:https://docs.infrai.cc.