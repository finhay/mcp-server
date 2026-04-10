# finhay-mcp-server

<!-- mcp-name: io.github.finhay/mcp-server -->

[Tiếng Việt](README.md) | [English](README.en.md)

MCP Server cho Finhay Securities — xem giá cổ phiếu, danh mục đầu tư, vàng, crypto qua Claude AI.

## Cài đặt

### Bước 1: Tạo API Key

Vào [https://www.finhay.com.vn/finhay-skills](https://www.finhay.com.vn/finhay-skills) → Đăng nhập → Tạo API Key.

Bạn sẽ nhận được:
- **API Key**: `ak_live_xxx`
- **API Secret**: `sk_live_yyy`

### Bước 2: Kết nối với Claude

Chọn **một trong ba** cách sau:

#### Cách 1: Cài đặt tự động (không cần Node.js — khuyên dùng)

Mở Terminal (macOS) hoặc PowerShell (Windows), dán lệnh sau và nhấn Enter:

**macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/finhay/mcp-server/main/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/finhay/mcp-server/main/install.ps1 | iex
```

Script sẽ tự động cài Node.js (nếu chưa có), hỏi API Key/Secret, và cấu hình Claude Desktop.

#### Cách 2: Cài đặt nhanh (cần Node.js)

Nếu bạn đã có Node.js (>= 18), chạy lệnh sau:

```bash
npx -y finhay-mcp-server --install
```

Script sẽ hỏi API Key/Secret (Secret được ẩn bằng dấu `*`), tự động ghi config vào Claude Desktop.

#### Cách 3: Cấu hình thủ công

**Bước 3a.** Tạo file credentials tại `~/.finhay/credentials/.env`:

```
FINHAY_API_KEY=ak_live_xxx
FINHAY_API_SECRET=sk_live_yyy
```

**Bước 3b.** Thêm vào file config Claude Desktop:
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

> API Key/Secret **không nằm** trong file config Claude — được lưu riêng tại `~/.finhay/credentials/.env` (dùng chung với Finhay Skills).

Sau khi hoàn tất, khởi động lại Claude Desktop là xong.

### Bước 3: Sử dụng

Mở Claude, hỏi:

- "Giá cổ phiếu VNM hôm nay?"
- "Xem danh mục đầu tư của tôi"
- "So sánh FPT và VNM"
- "Giá vàng SJC hôm nay bao nhiêu?"
- "Lãi suất tiết kiệm ngân hàng nào cao nhất?"
- "Chỉ số CPI Việt Nam gần đây?"

## Tools

### Thị trường (16 tools)

| Tool | Mô tả |
|------|-------|
| `get_stock_realtime` | Giá cổ phiếu realtime (1 mã, nhiều mã, hoặc theo sàn) |
| `get_price_history_chart` | Lịch sử giá OHLCV |
| `get_recommendation_reports` | Báo cáo phân tích từ chuyên gia |
| `get_funds` | Danh sách quỹ đầu tư |
| `get_fund_portfolio` | Danh mục của quỹ |
| `get_fund_months` | Các tháng có dữ liệu quỹ |
| `get_gold_prices` | Giá vàng (SJC, DOJI, PNJ, BTMC) |
| `get_gold_chart` | Biểu đồ giá vàng |
| `get_gold_providers` | Giá vàng theo nhà cung cấp |
| `get_silver_prices` | Giá bạc |
| `get_silver_chart` | Biểu đồ giá bạc |
| `get_all_financial_data` | Tổng hợp: vàng, bạc, crypto, lãi suất, tỷ giá |
| `get_bank_interest_rates` | Lãi suất tiết kiệm ngân hàng |
| `get_crypto_top_trending` | Crypto xu hướng |
| `get_macro_data` | Chỉ số vĩ mô (CPI, PMI, IIP, FED rate...) |
| `get_market_session` | Trạng thái phiên giao dịch |

### Tài khoản (10 tools)

| Tool | Mô tả |
|------|-------|
| `get_owner_info` | Thông tin chủ tài khoản |
| `get_account_summary` | Số dư: tiền mặt, chứng khoán, ký quỹ |
| `get_asset_summary` | Tổng tài sản |
| `get_portfolio` | Danh mục cổ phiếu với lãi/lỗ |
| `get_pnl_today` | Lãi/lỗ hôm nay |
| `get_order_history` | Lịch sử lệnh |
| `get_order_book` | Sổ lệnh trong ngày |
| `get_order_detail` | Chi tiết 1 lệnh |
| `get_user_rights` | Quyền cổ đông: cổ tức, quyền mua... |
| `get_trade_info` | Sức mua / số lượng bán được |


## Yêu cầu

- Node.js >= 18
- Tài khoản Finhay Securities với API Key
