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

    // --- News (corporate events) ---

    server.tool(
        'get_news',
        'Get stock corporate events (rights issues, dividends, AGM dates, etc.) filtered by symbol(s) and/or date range. Dates must be DD/MM/YYYY format.',
        {
            stock: z.string().optional().describe('Single stock symbol (e.g., VNM)'),
            stocks: z.string().optional().describe('Comma-separated symbols (e.g., VNM,VIC,HPG)'),
            from_date: z.string().optional().describe('Start date in DD/MM/YYYY (defaults to 1 year ago)'),
            to_date: z.string().optional().describe('End date in DD/MM/YYYY (only applied when both dates provided)'),
        },
        safeHandler(async ({ stock, stocks, from_date, to_date }) => {
            const query: Record<string, string> = {};
            if (stock) query.stock = stock.toUpperCase();
            if (stocks) query.stocks = stocks.toUpperCase();
            if (from_date) query.from_date = from_date;
            if (to_date) query.to_date = to_date;
            const data = await client.get('/market/news', query);
            return JSON.stringify(data.result, null, 2);
        }),
    );

    // --- Price history chart ---

    server.tool(
        'get_price_history_chart',
        'Get OHLCV price history chart for a stock. Timestamps must be Unix seconds (not milliseconds).',
        {
            symbol: z.string().describe('Stock symbol (e.g., FPT)'),
            resolution: z.enum(['1D', '5', '15', '30', '1H', '4H']).optional().describe('Chart resolution: 1D (daily), 5/15/30 (minutes), 1H, 4H. Default 1D.').default('1D'),
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

    // --- Metal providers ---

    server.tool(
        'get_metal_providers',
        'Get gold and silver prices grouped by provider (superset of gold-providers and silver data)',
        {},
        safeHandler(async () => {
            const data = await client.get('/market/financial-data/metal-providers');
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

    // --- Market data (global indices, big-tech, commodities, forex) ---

    server.tool(
        'get_market_data',
        'Get historical data points for a global market index, big-tech stock, commodity, or forex pair. Results ordered descending by date.',
        {
            type: z.enum([
                'SP500', 'DOW_JONES', 'NASDAQ', 'RUSSELL2000', 'VIX', 'DXY',
                'KOSPI', 'HANGSENG', 'SHANGHAI', 'NIKKEI',
                'APPLE', 'MICROSOFT', 'ALPHABET', 'AMAZON', 'META', 'NVIDIA', 'TESLA',
                'GOLD', 'SILVER', 'COPPER', 'CRUDE_OIL', 'BRENT_OIL', 'NATURAL_GAS',
                'EURUSD', 'USDJPY', 'GBPUSD',
            ]).describe('Market data type (US/Asian indices, big-tech stocks, commodities, forex)'),
            limit: z.number().min(1).max(500).optional().describe('Number of data points (default 50, max 500)'),
        },
        safeHandler(async ({ type, limit }) => {
            const query: Record<string, string> = { type };
            if (limit) query.limit = String(limit);
            const data = await client.get('/market/financial-data/market', query);
            return JSON.stringify(data.data, null, 2);
        }),
    );

    // --- Economic calendar events ---

    server.tool(
        'get_economic_calendar_events',
        'Get upcoming global economic events (CPI releases, Fed meetings, PMI announcements, etc.)',
        {
            weeks: z.number().optional().describe('Number of weeks ahead to fetch (default 1)'),
            country: z.enum([
                'China', 'Euro Area', 'Japan', 'United States', 'United Kingdom', 'Vietnam',
            ]).optional().describe('Filter by country (omit for all countries)'),
        },
        safeHandler(async ({ weeks, country }) => {
            const query: Record<string, string> = {};
            if (weeks) query.weeks = String(weeks);
            if (country) query.country = country;
            const data = await client.get('/market/financial-data/economic-calendar-events', query);
            return JSON.stringify(data.data, null, 2);
        }),
    );

    // --- Company financials ---

    server.tool(
        'get_company_financial_overview',
        'Get financial overview for a company: PE, PB, EV/EBITDA, gross margin, ROE, EPS, dividend yield, NIM, ROA, and industry averages',
        {
            symbol: z.string().describe('Stock symbol (e.g., VNM)'),
        },
        safeHandler(async ({ symbol }) => {
            const data = await client.get('/market/company-financial/overview', {
                symbol: symbol.toUpperCase(),
            });
            return JSON.stringify(data.data, null, 2);
        }),
    );

    server.tool(
        'get_company_financial_analysis',
        'Get financial analysis entries by year or quarter for a company',
        {
            symbol: z.string().describe('Stock symbol (e.g., VNM)'),
            period: z.enum(['annual', 'quarterly']).optional().describe('Period type (default: annual)'),
        },
        safeHandler(async ({ symbol, period }) => {
            const query: Record<string, string> = { symbol: symbol.toUpperCase() };
            if (period) query.period = period;
            const data = await client.get('/market/company-financial/analysis', query);
            return JSON.stringify(data.data, null, 2);
        }),
    );

    server.tool(
        'get_financial_statement',
        'Get financial statements (income statement, balance sheet, or cash flow) for a company',
        {
            symbol: z.string().describe('Stock symbol (e.g., VNM)'),
            type: z.enum(['income-statement', 'balance-sheet', 'cash-flow']).describe('Statement type'),
            period: z.enum(['annual', 'quarterly']).optional().describe('Period type'),
            limit: z.number().min(1).max(5).optional().describe('Number of periods to return (1-5, default: 5)'),
        },
        safeHandler(async ({ symbol, type, period, limit }) => {
            const query: Record<string, string> = {
                symbol: symbol.toUpperCase(),
                type,
            };
            if (period) query.period = period;
            if (limit) query.limit = String(limit);
            const data = await client.get('/market/v2/financial-statement/statement', query);
            return JSON.stringify(data.data, null, 2);
        }),
    );

    // --- Macro ---

    server.tool(
        'get_macro_data',
        'Get macroeconomic indicators for Vietnam or US (CPI, PMI, IIP, FED rate, etc.). JP and DE are only valid when type=GOVERNMENT_10Y_BOND_YIELD.',
        {
            type: z.enum([
                'IIP', 'CPI', 'PMI', 'PCE', 'CORE_PCE', 'NFP', 'GOODS_RETAIL', 'SERVICE_RETAIL',
                'TOTAL_EXPORT', 'FDI_EXPORT', 'DOMESTIC_EXPORT', 'FED_FUNDS_RATE', 'INTERBANK_RATE',
                'GOVERNMENT_10Y_BOND_YIELD', 'UNEMPLOYMENT_RATE',
            ]).describe('Macro indicator type'),
            country: z.enum(['VN', 'US', 'JP', 'DE']).describe('Country code (JP/DE only for GOVERNMENT_10Y_BOND_YIELD)'),
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
