import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FinhayClient } from '../client/FinhayClient.js';
import { AccountContext } from '../client/AccountContext.js';
import { registerMarketTools } from './market.js';
import { registerPortfolioTools } from './portfolio.js';

export function registerAllTools(server: McpServer, client: FinhayClient, account: AccountContext): void {
    registerMarketTools(server, client);                // 18 tools: stock, funds, gold, silver, crypto, macro, etc.
    registerPortfolioTools(server, client, account);    // 11 tools: account, portfolio, orders, pnl, rights, etc.
}
