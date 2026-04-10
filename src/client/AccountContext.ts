import { FinhayClient } from './FinhayClient.js';

export interface SubAccount {
    id: string;
    type: string;          // NORMAL | MARGIN
    subAccountExt: string;
}

export interface AccountInfo {
    userId: string;
    subAccounts: SubAccount[];
}

/**
 * Fetches and caches account info (userId, subAccounts) on startup.
 * Tools use this as default when user does not provide subAccountId.
 */
export class AccountContext {
    private info: AccountInfo | null = null;

    constructor(private readonly client: FinhayClient) {}

    async init(): Promise<void> {
        try {
            // Step 1: get userId from .data.user_id
            const meData = await this.client.get('/users/v1/users/me');
            const userId = meData.data?.user_id ?? '';

            if (!userId) {
                throw new Error('Could not extract user_id from /users/v1/users/me');
            }

            // Step 2: get sub-accounts with type and sub_account_ext
            const subData = await this.client.get(`/users/v1/users/${userId}/sub-accounts`);
            const subResult: any[] = Array.isArray(subData.result) ? subData.result
                : Array.isArray(subData.data) ? subData.data
                : [];

            const subAccounts: SubAccount[] = subResult
                .map((sa: any) => ({
                    id: sa.id ?? '',
                    type: (sa.type ?? '').toUpperCase(),
                    subAccountExt: sa.sub_account_ext ?? '',
                }))
                .filter((sa) => sa.id);

            this.info = { userId: String(userId), subAccounts };

            const summary = subAccounts.map((sa) => `${sa.type}=${sa.id}`).join(', ');
            console.error(`[finhay-mcp] Account loaded: userId=${this.info.userId}, subAccounts=[${summary}]`);
        } catch (err: any) {
            console.error(`[finhay-mcp] Warning: could not fetch account info: ${err.message}`);
            console.error('[finhay-mcp] Tools requiring subAccountId will need it as a parameter.');
        }
    }

    getUserId(): string | undefined {
        return this.info?.userId || undefined;
    }

    getSubAccountByType(type: string): SubAccount | undefined {
        return this.info?.subAccounts.find((sa) => sa.type === type.toUpperCase());
    }

    getDefaultSubAccountId(): string | undefined {
        // Prefer NORMAL, fallback to first available
        const normal = this.getSubAccountByType('NORMAL');
        return normal?.id || this.info?.subAccounts[0]?.id || undefined;
    }

    getSubAccountIds(): string[] {
        return this.info?.subAccounts.map((sa) => sa.id) ?? [];
    }

    /**
     * Returns the given subAccountId if provided, otherwise falls back to default.
     * Throws if neither is available.
     */
    resolveSubAccountId(subAccountId?: string): string {
        const resolved = subAccountId || this.getDefaultSubAccountId();
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
