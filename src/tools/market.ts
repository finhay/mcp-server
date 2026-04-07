import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { FinhayClient } from '../client/FinhayClient.js';
import { safeHandler } from '../utils/safeTool.js';

export function registerMarketTools(server: McpServer, client: FinhayClient): void {

    // --- Stock realtime ---

    server.tool(
        'get_stock_realtime',
        'Get realtime stock price. Use ONE of: symbol (single), symbols (multiple, comma-separated), or exchange (HOSE/HNX/UPCOM)',
        {
            symbol: z.string().optional().describe('Single stock symbol (e.g., VNM)'),
            symbols: z.string().optional().describe('Comma-separated symbols (e.g., VNM,FPT,VIC)'),
            exchange: z.string().optional().describe('Exchange code: HOSE, HNX, or UPCOM'),
        },
        safeHandler(async ({ symbol, symbols, exchange }) => {
            const query: Record<string, string> = {};
            if (symbol) query.symbol = symbol.toUpperCase();
            else if (symbols) query.symbols = symbols.toUpperCase();
            else if (exchange) query.exchange = exchange.toUpperCase();
            const data = await client.get('/market/stock-realtime', query);
            return JSON.stringify(data.result, null, 2);
        }),
    );

    // --- Price history chart ---

    server.tool(
        'get_price_history_chart',
        'Get OHLCV price history chart for a stock. Timestamps must be Unix seconds (not milliseconds).',
        {
            symbol: z.string().describe('Stock symbol (e.g., FPT)'),
            resolution: z.string().optional().describe('Resolution, only "1D" supported').default('1D'),
            from: z.number().describe('Start timestamp in Unix SECONDS'),
            to: z.number().describe('End timestamp in Unix SECONDS'),
        },
        safeHandler(async ({ symbol, resolution, from, to }) => {
            const data = await client.get('/market/price-histories-chart', {
                symbol: symbol.toUpperCase(),
                resolution: resolution || '1D',
                from: String(from),
                to: String(to),
            });
            return JSON.stringify(data.data, null, 2);
        }),
    );

    // --- Recommendation reports ---

    server.tool(
        'get_recommendation_reports',
        'Get analyst recommendation reports for a stock symbol',
        { symbol: z.string().describe('Stock symbol (e.g., VNM)') },
        safeHandler(async ({ symbol }) => {
            const data = await client.get(`/market/recommendation-reports/${symbol.toUpperCase()}`);
            return JSON.stringify(data.data, null, 2);
        }),
    );

    // --- Funds ---

    server.tool(
        'get_funds',
        'Get list of all available investment funds with performance data',
        {},
        safeHandler(async () => {
            const data = await client.get('/market/funds');
            return JSON.stringify(data.data, null, 2);
        }),
    );

    server.tool(
        'get_fund_portfolio',
        'Get portfolio composition of a specific fund',
        {
            fund: z.string().describe('Fund code (e.g., DCDS)'),
            month: z.string().optional().describe('Month in YYYY-MM format (defaults to latest)'),
        },
        safeHandler(async ({ fund, month }) => {
            const query: Record<string, string> = {};
            if (month) query.month = month;
            const data = await client.get(`/market/funds/${fund}/portfolio`, query);
            return JSON.stringify(data.data, null, 2);
        }),
    );

    server.tool(
        'get_fund_months',
        'Get available months for a fund portfolio',
        { fund: z.string().describe('Fund code (e.g., DCDS)') },
        safeHandler(async ({ fund }) => {
            const data = await client.get(`/market/funds/${fund}/months`);
            return JSON.stringify(data.data, null, 2);
        }),
    );

    // --- Gold ---

    server.tool(
        'get_gold_prices',
        'Get current gold prices from Vietnamese providers (SJC, DOJI, PNJ, BTMC)',
        {},
        safeHandler(async () => {
            const data = await client.get('/market/financial-data/gold');
            return JSON.stringify(data.data, null, 2);
        }),
    );

    server.tool(
        'get_gold_chart',
        'Get gold price chart data over a number of days',
        { days: z.number().optional().describe('Number of days (default: 30)').default(30) },
        safeHandler(async ({ days }) => {
            const data = await client.get('/market/financial-data/gold-chart', { days: String(days) });
            return JSON.stringify(data.data, null, 2);
        }),
    );

    server.tool(
        'get_gold_providers',
        'Get gold prices grouped by provider (PNJ, DOJI, BTMC, SJC)',
        {},
        safeHandler(async () => {
            const data = await client.get('/market/financial-data/gold-providers');
            return JSON.stringify(data.data, null, 2);
        }),
    );

    // --- Silver ---

    server.tool(
        'get_silver_prices',
        'Get current silver prices',
        {},
        safeHandler(async () => {
            const data = await client.get('/market/financial-data/silver');
            return JSON.stringify(data.data, null, 2);
        }),
    );

    server.tool(
        'get_silver_chart',
        'Get silver price chart data over a number of days',
        { days: z.number().optional().describe('Number of days (default: 30)').default(30) },
        safeHandler(async ({ days }) => {
            const data = await client.get('/market/financial-data/silver-chart', { days: String(days) });
            return JSON.stringify(data.data, null, 2);
        }),
    );

    // --- Financial data ---

    server.tool(
        'get_all_financial_data',
        'Get all financial data: gold, silver, crypto, bank rates, USD exchange rate',
        {},
        safeHandler(async () => {
            const data = await client.get('/market/financial-data');
            return JSON.stringify(data.data, null, 2);
        }),
    );

    server.tool(
        'get_bank_interest_rates',
        'Get bank deposit interest rates from Vietnamese banks',
        {},
        safeHandler(async () => {
            const data = await client.get('/market/financial-data/bank-interest-rates');
            return JSON.stringify(data.data, null, 2);
        }),
    );

    server.tool(
        'get_crypto_top_trending',
        'Get top trending cryptocurrencies with price, market cap, and 30-day chart',
        {},
        safeHandler(async () => {
            const data = await client.get('/market/financial-data/cryptos/top-trending');
            return JSON.stringify(data.data, null, 2);
        }),
    );

    // --- Macro ---

    server.tool(
        'get_macro_data',
        'Get macroeconomic indicators for Vietnam or US (CPI, PMI, IIP, FED rate, etc.)',
        {
            type: z.enum([
                'IIP', 'CPI', 'PMI', 'PCE', 'CORE_PCE', 'NFP', 'GOODS_RETAIL', 'SERVICE_RETAIL',
                'TOTAL_EXPORT', 'FDI_EXPORT', 'DOMESTIC_EXPORT', 'FED_FUNDS_RATE', 'INTERBANK_RATE',
                'GOVERNMENT_10Y_BOND_YIELD', 'UNEMPLOYMENT_RATE',
            ]).describe('Macro indicator type'),
            country: z.enum(['VN', 'US']).describe('Country code'),
            period: z.enum(['ONE_MONTH', 'ONE_YEAR', 'YTD']).optional().describe('Time period filter'),
        },
        safeHandler(async ({ type, country, period }) => {
            const query: Record<string, string> = { type, country };
            if (period) query.period = period;
            const data = await client.get('/market/financial-data/macro', query);
            return JSON.stringify(data.data, null, 2);
        }),
    );

    // --- Market session ---

    server.tool(
        'get_market_session',
        'Get current market session status and available order types for an exchange',
        {
            exchange: z.enum(['HOSE', 'HNX', 'UPCOM', 'HCX']).describe('Exchange code'),
        },
        safeHandler(async ({ exchange }) => {
            const data = await client.get('/trading/market/session', { exchange });
            return JSON.stringify(data.result, null, 2);
        }),
    );
}
