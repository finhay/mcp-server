import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { FinhayClient } from '../client/FinhayClient.js';
import { AccountContext } from '../client/AccountContext.js';
import { safeHandler } from '../utils/safeTool.js';

export function registerPortfolioTools(server: McpServer, client: FinhayClient, account: AccountContext): void {

    // --- Account summary ---

    server.tool(
        'get_account_summary',
        'Get account balance summary: cash, securities value, margin, net asset value',
        {
            subAccountId: z.string().optional().describe('Sub-account ID (auto-detected if omitted)'),
        },
        safeHandler(async ({ subAccountId }) => {
            const id = account.resolveSubAccountId(subAccountId);
            const data = await client.get(`/trading/accounts/${id}/summary`);
            return JSON.stringify(data.result, null, 2);
        }),
    );

    // --- Asset summary ---

    server.tool(
        'get_asset_summary',
        'Get asset summary with total valuation',
        {
            userId: z.string().optional().describe('User ID (auto-detected if omitted)'),
        },
        safeHandler(async ({ userId }) => {
            const uid = account.resolveUserId(userId);
            const data = await client.get(`/users/v3/users/${uid}/assets/summary`);
            return JSON.stringify(data.data, null, 2);
        }),
    );

    // --- Portfolio ---

    server.tool(
        'get_portfolio',
        'Get portfolio positions with P/L, cost basis, available quantity per stock',
        {
            subAccountId: z.string().optional().describe('Sub-account ID (auto-detected if omitted)'),
        },
        safeHandler(async ({ subAccountId }) => {
            const id = account.resolveSubAccountId(subAccountId);
            const data = await client.get(`/trading/v2/sub-accounts/${id}/portfolio`);
            return JSON.stringify(data.data, null, 2);
        }),
    );

    // --- PnL today ---

    server.tool(
        'get_pnl_today',
        'Get today profit/loss amount and rate',
        {
            userId: z.string().optional().describe('User ID (auto-detected if omitted)'),
            subAccountId: z.string().optional().describe('Sub-account ID (default: ALL)'),
        },
        safeHandler(async ({ userId, subAccountId }) => {
            const uid = account.resolveUserId(userId);
            const query: Record<string, string> = {};
            if (subAccountId) query['sub-account-id'] = subAccountId;
            const data = await client.get(`/trading/pnl-today/${uid}`, query);
            return JSON.stringify(data.data, null, 2);
        }),
    );

    // --- Order history ---

    server.tool(
        'get_order_history',
        'Get order history for a sub-account within a date range',
        {
            subAccountId: z.string().optional().describe('Sub-account ID (auto-detected if omitted)'),
            fromDate: z.string().describe('Start date (YYYY-MM-DD)'),
            toDate: z.string().describe('End date (YYYY-MM-DD)'),
            page: z.number().optional().describe('Page number (default: 1)'),
            orderStatus: z.string().optional().describe('Filter by status (default: ALL)'),
            symbol: z.string().optional().describe('Filter by symbol (default: ALL)'),
        },
        safeHandler(async ({ subAccountId, fromDate, toDate, page, orderStatus, symbol }) => {
            const id = account.resolveSubAccountId(subAccountId);
            const query: Record<string, string> = { fromDate, toDate };
            if (page) query.page = String(page);
            if (orderStatus) query.orderStatus = orderStatus;
            if (symbol) query.symbol = symbol.toUpperCase();
            const data = await client.get(`/trading/sub-accounts/${id}/orders`, query);
            return JSON.stringify(data.result, null, 2);
        }),
    );

    // --- Order book (intraday) ---

    server.tool(
        'get_order_book',
        'Get intraday order book (today pending/matched orders)',
        {
            subAccountId: z.string().optional().describe('Sub-account ID (auto-detected if omitted)'),
        },
        safeHandler(async ({ subAccountId }) => {
            const id = account.resolveSubAccountId(subAccountId);
            const data = await client.get(`/trading/v1/accounts/${id}/order-book`);
            return JSON.stringify(data.result, null, 2);
        }),
    );

    // --- Order detail ---

    server.tool(
        'get_order_detail',
        'Get detail of a specific order by ID',
        {
            subAccountId: z.string().optional().describe('Sub-account ID (auto-detected if omitted)'),
            orderId: z.string().describe('Order ID'),
        },
        safeHandler(async ({ subAccountId, orderId }) => {
            const id = account.resolveSubAccountId(subAccountId);
            const data = await client.get(`/trading/v1/accounts/${id}/order-book/${orderId}`);
            return JSON.stringify(data.data, null, 2);
        }),
    );

    // --- User rights (corporate actions) ---

    server.tool(
        'get_user_rights',
        'Get corporate actions: dividends, stock rights, meetings, etc.',
        {
            subAccountId: z.string().optional().describe('Sub-account ID (auto-detected if omitted)'),
            fromDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
            toDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
            catType: z.string().optional().describe('Category type, comma-separated or ALL (default: ALL)'),
            isCom: z.string().optional().describe('Commission filter (default: ALL)'),
            symbol: z.string().optional().describe('Filter by symbol (default: ALL)'),
            status: z.string().optional().describe('Status filter, comma-separated or ALL (default: ALL)'),
        },
        safeHandler(async ({ subAccountId, fromDate, toDate, catType, isCom, symbol, status }) => {
            const id = account.resolveSubAccountId(subAccountId);
            const query: Record<string, string> = {};
            if (fromDate) query.fromDate = fromDate;
            if (toDate) query.toDate = toDate;
            if (catType) query.catType = catType;
            if (isCom) query.isCom = isCom;
            if (symbol) query.symbol = symbol.toUpperCase();
            if (status) query.status = status;
            const data = await client.get(`/trading/v5/account/${id}/user-rights`, query);
            return JSON.stringify(data.result, null, 2);
        }),
    );
}
