#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CREDENTIALS_PATH = path.join(os.homedir(), '.finhay', 'credentials', '.env');

function ask(question: string): Promise<string> {
    process.stdout.write(question);
    return new Promise((resolve) => {
        let buf = '';
        process.stdin.setEncoding('utf8');
        process.stdin.resume();
        const onData = (chunk: string) => {
            buf += chunk;
            if (buf.includes('\n')) {
                process.stdin.pause();
                process.stdin.removeListener('data', onData);
                resolve(buf.replace('\n', '').trim());
            }
        };
        process.stdin.on('data', onData);
    });
}

function askMasked(question: string): Promise<string> {
    process.stdout.write(question);
    if (!process.stdin.isTTY) return ask('');
    return new Promise((resolve) => {
        process.stdin.setRawMode(true);
        process.stdin.setEncoding('utf8');
        process.stdin.resume();
        let input = '';
        const onData = (ch: string) => {
            if (ch === '\r' || ch === '\n') {
                process.stdin.setRawMode(false);
                process.stdin.pause();
                process.stdin.removeListener('data', onData);
                process.stdout.write('\n');
                resolve(input.trim());
            } else if (ch === '\u007F' || ch === '\b') {
                if (input.length > 0) {
                    input = input.slice(0, -1);
                    process.stdout.write('\b \b');
                }
            } else if (ch === '\u0003') {
                process.stdout.write('\n');
                process.exit(0);
            } else {
                input += ch;
                process.stdout.write('*');
            }
        };
        process.stdin.on('data', onData);
    });
}

function getClaudeConfigPath(): string {
    const platform = os.platform();
    if (platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    } else if (platform === 'win32') {
        return path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json');
    } else {
        return path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json');
    }
}

function upsertEnvFile(filePath: string, vars: Record<string, string>): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    let lines: string[] = [];
    if (fs.existsSync(filePath)) {
        lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    }

    const written = new Set<string>();
    const updatedLines = lines.map((line) => {
        const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=/);
        if (match && match[1] in vars) {
            written.add(match[1]);
            return `${match[1]}=${vars[match[1]]}`;
        }
        return line;
    });

    for (const [key, value] of Object.entries(vars)) {
        if (!written.has(key)) {
            updatedLines.push(`${key}=${value}`);
        }
    }

    const content = updatedLines.filter((l) => l !== '').join('\n') + '\n';
    fs.writeFileSync(filePath, content, { mode: 0o600 });
}

function updateClaudeConfig(): void {
    const configPath = getClaudeConfigPath();
    const configDir = path.dirname(configPath);

    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    let config: any = {};
    if (fs.existsSync(configPath)) {
        try {
            config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        } catch {
            console.log(`  Canh bao: Khong doc duoc ${configPath}, se tao file moi.`);
        }
    }

    if (!config.mcpServers) {
        config.mcpServers = {};
    }

    config.mcpServers.finhay = {
        command: 'npx',
        args: ['-y', 'finhay-mcp-server'],
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`  Claude Desktop config: ${configPath}`);
}

async function main() {
    console.log('\n  Finhay MCP Server — Cai dat cho Claude Desktop\n');
    console.log('  Tao API Key tai: https://www.finhay.com.vn/finhay-skills\n');

    let apiKey = '';
    let apiSecret = '';

    if (fs.existsSync(CREDENTIALS_PATH)) {
        const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
        const keyMatch = content.match(/FINHAY_API_KEY=(.+)/);
        const secretMatch = content.match(/FINHAY_API_SECRET=(.+)/);

        if (keyMatch && secretMatch) {
            const maskedKey = keyMatch[1].trim().slice(0, 8) + '***';
            console.log(`  Tim thay credentials tai ${CREDENTIALS_PATH}`);
            console.log(`  API Key: ${maskedKey}\n`);

            const reuse = await ask('  Su dung credentials nay? (Y/n): ');
            if (reuse.toLowerCase() !== 'n') {
                apiKey = keyMatch[1].trim();
                apiSecret = secretMatch[1].trim();
            }
            console.log();
        }
    }

    if (!apiKey) {
        apiKey = await ask('  API Key: ');
        if (!apiKey) {
            console.error('\n  Loi: API Key khong duoc de trong.\n');
            process.exit(1);
        }

        apiSecret = await askMasked('  API Secret: ');
        if (!apiSecret) {
            console.error('\n  Loi: API Secret khong duoc de trong.\n');
            process.exit(1);
        }

        upsertEnvFile(CREDENTIALS_PATH, {
            FINHAY_API_KEY: apiKey,
            FINHAY_API_SECRET: apiSecret,
            FINHAY_BASE_URL: 'https://open-api.fhsc.com.vn',
        });
        console.log(`\n  Credentials: ${CREDENTIALS_PATH} (permission: 600)\n`);
    }

    updateClaudeConfig();

    console.log('\n  Da cai dat thanh cong!');
    console.log('  Hay khoi dong lai Claude Desktop de su dung.\n');
}

export const run = main().catch((err) => {
    console.error('Loi:', err.message);
    process.exit(1);
});
