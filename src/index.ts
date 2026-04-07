#!/usr/bin/env node
import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getConfig } from './config/environment.js';
import { FinhayClient } from './client/FinhayClient.js';
import { AccountContext } from './client/AccountContext.js';
import { registerAllTools } from './tools/index.js';

const config = getConfig();
const client = new FinhayClient(config.baseUrl, config.apiKey, config.apiSecret);

const account = new AccountContext(client);
await account.init();

const server = new McpServer({
    name: 'finhay-mcp-server',
    version: '1.0.0',
});

registerAllTools(server, client, account);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error('[finhay-mcp] Server started, connected via stdio');
