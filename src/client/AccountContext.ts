import { FinhayClient } from './FinhayClient.js';

export interface AccountInfo {
    userId: string;
    defaultSubAccountId: string;
    subAccountIds: string[];
}

/**
 * Fetches and caches account info (userId, subAccountIds) on startup.
 * Tools use this as default when user does not provide subAccountId.
 */
export class AccountContext {
    private info: AccountInfo | null = null;

    constructor(private readonly client: FinhayClient) {}

    async init(): Promise<void> {
        try {
            const data = await this.client.get('/users/oa/me');
            const result = data.result ?? data.data;

            const userId = result?.id ?? result?.userId ?? '';
            const subAccounts: any[] = result?.subAccounts ?? result?.sub_accounts ?? [];

            const subAccountIds = subAccounts.map(
                (sa: any) => sa.subAccountId ?? sa.sub_account_id ?? sa.id ?? '',
            ).filter(Boolean);

            this.info = {
                userId: String(userId),
                defaultSubAccountId: subAccountIds[0] ?? '',
                subAccountIds,
            };

            console.error(`[finhay-mcp] Account loaded: userId=${this.info.userId}, subAccounts=[${subAccountIds.join(', ')}]`);
        } catch (err: any) {
            console.error(`[finhay-mcp] Warning: could not fetch account info: ${err.message}`);
            console.error('[finhay-mcp] Tools requiring subAccountId will need it as a parameter.');
        }
    }

    getUserId(): string | undefined {
        return this.info?.userId || undefined;
    }

    getDefaultSubAccountId(): string | undefined {
        return this.info?.defaultSubAccountId || undefined;
    }

    getSubAccountIds(): string[] {
        return this.info?.subAccountIds ?? [];
    }

    /**
     * Returns the given subAccountId if provided, otherwise falls back to default.
     * Throws if neither is available.
     */
    resolveSubAccountId(subAccountId?: string): string {
        const resolved = subAccountId || this.info?.defaultSubAccountId;
        if (!resolved) {
            throw new Error(
                'subAccountId is required. Could not auto-detect — provide it explicitly or check your API credentials.',
            );
        }
        return resolved;
    }

    resolveUserId(userId?: string): string {
        const resolved = userId || this.info?.userId;
        if (!resolved) {
            throw new Error(
                'userId is required. Could not auto-detect — provide it explicitly or check your API credentials.',
            );
        }
        return resolved;
    }
}
