# finhay-mcp-server

<!-- mcp-name: io.github.finhay/mcp-server -->

[Tiếng Việt](README.md) | [English](README.en.md)

MCP Server for Finhay Securities — view stock prices, portfolio, gold, crypto via Claude AI.

## Installation

### Step 1: Create API Key

Go to [https://www.finhay.com.vn/finhay-skills](https://www.finhay.com.vn/finhay-skills) → Login → Create API Key.

You will receive:
- **API Key**: `ak_live_xxx`
- **API Secret**: `sk_live_yyy`

### Step 2: Connect to Claude

Choose **one of three** methods below:

#### Method 1: Automatic install (no Node.js required — Recommended)

Open Terminal (macOS) or PowerShell (Windows), paste this command and press Enter:

**macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/finhay/mcp-server/main/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/finhay/mcp-server/main/install.ps1 | iex
```

The script will auto-install Node.js (if needed), prompt for API Key/Secret, and configure Claude Desktop.

#### Method 2: Quick install (Node.js required)

If you already have Node.js (>= 18), run:

```bash
npx -y finhay-mcp-server --install
```

The script will prompt for API Key/Secret (Secret is masked with `*`), then automatically write the config to Claude Desktop.

#### Method 3: Manual configuration

**Step 3a.** Create credentials file at `~/.finhay/credentials/.env`:

```
FINHAY_API_KEY=ak_live_xxx
FINHAY_API_SECRET=sk_live_yyy
```

**Step 3b.** Add to Claude Desktop config:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Windows (Microsoft Store): `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "finhay": {
      "command": "npx",
      "args": ["-y", "finhay-mcp-server"]
    }
  }
}
```

> API Key/Secret are **not stored** in Claude config — they live separately at `~/.finhay/credentials/.env` (shared with Finhay Skills).

Restart Claude Desktop after setup.

### Step 3: Usage

Open Claude and ask:

- "What's VNM stock price today?"
- "Show my investment portfolio"
- "Compare FPT and VNM"
- "What's SJC gold price today?"
- "Which bank has the highest savings rate?"
- "Recent Vietnam CPI index?"

## Tools

### Market data (20 tools)

| Tool | Description |
|------|-------------|
| `get_stock_realtime` | Realtime stock prices (single, multiple, or by exchange) |
| `get_price_history_chart` | OHLCV price history |
| `get_recommendation_reports` | Analyst recommendation reports |
| `get_funds` | List of investment funds |
| `get_fund_portfolio` | Fund portfolio composition |
| `get_fund_months` | Available months for fund data |
| `get_gold_prices` | Gold prices (SJC, DOJI, PNJ, BTMC) |
| `get_gold_chart` | Gold price chart |
| `get_gold_providers` | Gold prices by provider |
| `get_silver_prices` | Silver prices |
| `get_silver_chart` | Silver price chart |
| `get_metal_providers` | Gold + silver prices by provider |
| `get_all_financial_data` | All-in-one: gold, silver, crypto, rates, FX |
| `get_bank_interest_rates` | Bank savings interest rates |
| `get_crypto_top_trending` | Top trending cryptocurrencies |
| `get_company_financial_overview` | Company financial overview (PE, PB, ROE, EPS...) |
| `get_company_financial_analysis` | Financial analysis by year/quarter |
| `get_financial_statement` | Financial statements (income, balance sheet, cash flow) |
| `get_macro_data` | Macro indicators (CPI, PMI, IIP, FED rate...) |
| `get_market_session` | Trading session status |

### Account (8 tools)

| Tool | Description |
|------|-------------|
| `get_account_summary` | Balance: cash, securities, margin |
| `get_asset_summary` | Total assets |
| `get_portfolio` | Stock portfolio with P/L |
| `get_pnl_today` | Today's profit/loss |
| `get_order_history` | Order history |
| `get_order_book` | Today's order book |
| `get_order_detail` | Single order detail |
| `get_user_rights` | Shareholder rights: dividends, rights issues... |


## Requirements

- Node.js >= 18
- Finhay Securities account with API Key
