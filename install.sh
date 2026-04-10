#!/bin/bash
set -e

# When running via `curl | bash`, stdin is the pipe — any subprocess that reads
# stdin (brew, sudo, etc.) will eat the rest of the script. Re-execute from a
# downloaded file so stdin is free for `read` and child processes.
if [ ! -t 0 ] && [ -z "$FINHAY_REEXEC" ]; then
    SCRIPT_TMP=$(mktemp)
    if curl -fsSL https://raw.githubusercontent.com/finhay/mcp-server/main/install.sh -o "$SCRIPT_TMP"; then
        FINHAY_REEXEC=1 bash "$SCRIPT_TMP" </dev/tty
        EXIT_CODE=$?
        rm -f "$SCRIPT_TMP"
        exit $EXIT_CODE
    else
        rm -f "$SCRIPT_TMP"
        echo "  Loi: Khong the tai script. Vui long thu lai."
        exit 1
    fi
fi

echo ""
echo "  Finhay MCP Server — Cai dat cho Claude Desktop"
echo ""

# --- Check & install Node.js ---
if ! command -v node &>/dev/null; then
    echo "  Node.js chua duoc cai dat. Dang cai dat..."
    echo ""

    if command -v brew &>/dev/null; then
        brew install node
    else
        echo "  Dang cai dat Node.js tu nodejs.org..."
        ARCH=$(uname -m)
        if [ "$ARCH" = "arm64" ]; then
            NODE_URL="https://nodejs.org/dist/v22.14.0/node-v22.14.0-darwin-arm64.tar.gz"
        else
            NODE_URL="https://nodejs.org/dist/v22.14.0/node-v22.14.0-darwin-x64.tar.gz"
        fi
        TMP_DIR=$(mktemp -d)
        curl -fsSL "$NODE_URL" -o "$TMP_DIR/node.tar.gz"
        tar -xzf "$TMP_DIR/node.tar.gz" -C "$TMP_DIR"
        sudo cp -R "$TMP_DIR"/node-*/bin/* /usr/local/bin/
        sudo cp -R "$TMP_DIR"/node-*/lib/* /usr/local/lib/
        rm -rf "$TMP_DIR"
    fi

    if ! command -v node &>/dev/null; then
        echo "  Loi: Khong the cai dat Node.js. Hay cai thu cong tai https://nodejs.org"
        exit 1
    fi
    echo "  Node.js $(node -v) da duoc cai dat."
    echo ""
fi

# --- Credentials ---
CREDS_DIR="$HOME/.finhay/credentials"
CREDS_FILE="$CREDS_DIR/.env"

API_KEY=""
API_SECRET=""

if [ -f "$CREDS_FILE" ]; then
    EXISTING_KEY=$(sed -n 's/^FINHAY_API_KEY=//p' "$CREDS_FILE" 2>/dev/null || true)
    EXISTING_SECRET=$(sed -n 's/^FINHAY_API_SECRET=//p' "$CREDS_FILE" 2>/dev/null || true)

    if [ -n "$EXISTING_KEY" ] && [ -n "$EXISTING_SECRET" ]; then
        MASKED_KEY="$(echo "$EXISTING_KEY" | cut -c1-8)***"
        echo "  Tim thay credentials tai $CREDS_FILE"
        echo "  API Key: $MASKED_KEY"
        echo ""
        read -p "  Su dung credentials nay? (Y/n): " REUSE
        REUSE_LOWER=$(echo "$REUSE" | tr '[:upper:]' '[:lower:]')
        if [ "$REUSE_LOWER" != "n" ]; then
            API_KEY="$EXISTING_KEY"
            API_SECRET="$EXISTING_SECRET"
        fi
        echo ""
    fi
fi

if [ -z "$API_KEY" ]; then
    echo "  Tao API Key tai: https://www.finhay.com.vn/finhay-skills"
    echo ""
    read -p "  API Key: " API_KEY
    if [ -z "$API_KEY" ]; then
        echo "  Loi: API Key khong duoc de trong."
        exit 1
    fi

    read -s -p "  API Secret: " API_SECRET
    echo ""
    if [ -z "$API_SECRET" ]; then
        echo "  Loi: API Secret khong duoc de trong."
        exit 1
    fi

    # Save credentials
    mkdir -p "$CREDS_DIR"
    cat > "$CREDS_FILE" <<EOF
FINHAY_API_KEY=$API_KEY
FINHAY_API_SECRET=$API_SECRET
FINHAY_BASE_URL=https://open-api.fhsc.com.vn
EOF
    chmod 600 "$CREDS_FILE"
    echo ""
    echo "  Credentials: $CREDS_FILE (permission: 600)"
    echo ""
fi

# --- Claude Desktop config ---
CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
CONFIG_DIR=$(dirname "$CONFIG_PATH")

mkdir -p "$CONFIG_DIR"

if [ -f "$CONFIG_PATH" ]; then
    # Check if finhay entry already exists
    if grep -q '"finhay"' "$CONFIG_PATH" 2>/dev/null; then
        echo "  Claude Desktop config da co entry 'finhay', bo qua."
    else
        # Add finhay to existing mcpServers
        node -e "
            const fs = require('fs');
            const config = JSON.parse(fs.readFileSync('$CONFIG_PATH', 'utf-8'));
            if (!config.mcpServers) config.mcpServers = {};
            config.mcpServers.finhay = { command: 'npx', args: ['-y', 'finhay-mcp-server'] };
            fs.writeFileSync('$CONFIG_PATH', JSON.stringify(config, null, 2));
        "
    fi
else
    cat > "$CONFIG_PATH" <<'EOF'
{
  "mcpServers": {
    "finhay": {
      "command": "npx",
      "args": ["-y", "finhay-mcp-server"]
    }
  }
}
EOF
fi

echo "  Claude Desktop config: $CONFIG_PATH"
echo ""
echo "  Da cai dat thanh cong!"
echo "  Hay khoi dong lai Claude Desktop de su dung."
echo ""
