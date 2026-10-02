import { randomUUID } from "node:crypto";
import type { InfraiClient } from "./infrai_client.ts";

export type TenantAccount = {
  tenantId: string;
  userId: string;
  keyId: string;
  status: "active" | "offboarding" | "offboarded";
  userDeleted: boolean;
  keyRevoked: boolean;
};

export class TenantAccounts {
  private readonly accounts = new Map<string, TenantAccount>();
  private readonly infrai: InfraiClient;

  constructor(infrai: InfraiClient) {
    this.infrai = infrai;
  }

  async onboard(input: { tenantId: string; email: string; name: string }) {
    if (this.accounts.has(input.tenantId)) throw new Error("Tenant already exists");
    const user = await this.infrai.createUser({
      email: input.email,
      name: input.name,
      metadata: { tenant_id: input.tenantId, role: "media_creator" },
      idempotency_key: `tenant-user-${input.tenantId}`,
    });
    const scopedKey = await this.infrai.createScopedKey({
      project_id: input.tenantId,
      name: `${input.name} media key`,
      scopes: ["media:ingest", "media:process", "media:deliver"],
      idempotency_key: `tenant-key-${input.tenantId}`,
    });
    const account: TenantAccount = {
      tenantId: input.tenantId,
      userId: user.id,
      keyId: scopedKey.id,
      status: "active",
      userDeleted: false,
      keyRevoked: false,
    };
    this.accounts.set(input.tenantId, account);
    return { account, key: scopedKey.key };
  }

  async offboard(tenantId: string): Promise<TenantAccount> {
    const account = this.accounts.get(tenantId);
    if (!account) throw new Error("Tenant not found");
    account.status = "offboarding";

    if (!account.userDeleted) {
      await this.infrai.deleteUser(account.userId);
      account.userDeleted = true;
    }
    if (!account.keyRevoked) {
      await this.infrai.revokeKey(account.keyId);
      account.keyRevoked = true;
    }
    account.status = "offboarded";
    return account;
  }

  get(tenantId: string): TenantAccount | undefined {
    return this.accounts.get(tenantId);
  }
}
