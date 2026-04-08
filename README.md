# @finhay/mcp-server

MCP Server cho Finhay Securities — xem gia co phieu, danh muc dau tu, vang, crypto qua Claude AI.

## Cai dat

### Buoc 1: Tao API Key

Vao [https://www.finhay.com.vn/finhay-skills](https://www.finhay.com.vn/finhay-skills) → Dang nhap → Tao API Key.

Ban se nhan duoc:
- **API Key**: `ak_live_xxx`
- **API Secret**: `sk_live_yyy`

### Buoc 2: Ket noi voi Claude

Chon **mot trong ba** cach sau:

#### Cach 1: Cai dat tu dong (Khuyen dung)

Chay lenh sau va nhap API Key/Secret theo huong dan:

```bash
npx -y finhay-mcp --install
```

Sau khi hoan tat, khoi dong lai Claude Desktop la xong.

#### Cach 2: Claude Code CLI

Neu ban da cai [Claude Code](https://docs.anthropic.com/en/docs/claude-code), chay:

```bash
claude mcp add finhay -- npx -y finhay-mcp
```

Config se tu dong dong bo sang Claude Desktop.

#### Cach 3: Cau hinh thu cong

**Buoc 3a.** Tao file credentials tai `~/.finhay/credentials/.env`:

```
FINHAY_API_KEY=ak_live_xxx
FINHAY_API_SECRET=sk_live_yyy
```

**Buoc 3b.** Them vao file config Claude Desktop:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "finhay": {
      "command": "npx",
      "args": ["-y", "@finhay/mcp-server"]
    }
  }
}
```

> API Key/Secret **khong nam** trong file config Claude — duoc luu rieng tai `~/.finhay/credentials/.env` (dung chung voi Finhay Skills).

### Buoc 3: Su dung

Mo Claude, hoi:

- "Gia co phieu VNM hom nay?"
- "Xem danh muc dau tu cua toi"
- "So sanh FPT va VNM"
- "Gia vang SJC hom nay bao nhieu?"
- "Lai suat tiet kiem ngan hang nao cao nhat?"
- "Chi so CPI Viet Nam gan day?"

## Tools

### Thi truong (18 tools)

| Tool | Mo ta |
|------|-------|
| `get_stock_realtime` | Gia co phieu realtime (1 ma, nhieu ma, hoac theo san) |
| `get_price_history_chart` | Lich su gia OHLCV |
| `get_recommendation_reports` | Bao cao phan tich tu chuyen gia |
| `get_funds` | Danh sach quy dau tu |
| `get_fund_portfolio` | Danh muc cua quy |
| `get_fund_months` | Cac thang co du lieu quy |
| `get_gold_prices` | Gia vang (SJC, DOJI, PNJ, BTMC) |
| `get_gold_chart` | Bieu do gia vang |
| `get_gold_providers` | Gia vang theo nha cung cap |
| `get_silver_prices` | Gia bac |
| `get_silver_chart` | Bieu do gia bac |
| `get_all_financial_data` | Tong hop: vang, bac, crypto, lai suat, ty gia |
| `get_bank_interest_rates` | Lai suat tiet kiem ngan hang |
| `get_crypto_top_trending` | Crypto xu huong |
| `get_macro_data` | Chi so vi mo (CPI, PMI, IIP, FED rate...) |
| `get_market_session` | Trang thai phien giao dich |

### Tai khoan (11 tools)

| Tool | Mo ta |
|------|-------|
| `get_owner_info` | Thong tin chu tai khoan |
| `get_account_summary` | So du: tien mat, chung khoan, ky quy |
| `get_asset_summary` | Tong tai san |
| `get_portfolio` | Danh muc co phieu voi lai/lo |
| `get_pnl_today` | Lai/lo hom nay |
| `get_order_history` | Lich su lenh |
| `get_order_book` | So lenh trong ngay |
| `get_order_detail` | Chi tiet 1 lenh |
| `get_user_rights` | Quyen co dong: co tuc, quyen mua... |
| `get_trade_info` | Suc mua / so luong ban duoc |


## Yeu cau

- Node.js >= 18
- Tai khoan Finhay Securities voi API Key