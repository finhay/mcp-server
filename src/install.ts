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
        // Microsoft Store version uses LocalCache path
        const localAppData = process.env.LOCALAPPDATA || '';
        const storePath = path.join(localAppData, 'Packages', 'Claude_pzs8sxrjxfjjc', 'LocalCache', 'Roaming', 'Claude', 'claude_desktop_config.json');
        if (fs.existsSync(storePath) || fs.existsSync(path.dirname(storePath))) {
            return storePath;
        }
        // Standard installer version
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

function updateClaudeConfig(): string {
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
    return configPath;
}

async function main() {
    console.log('\n  Finhay MCP Server — Cai dat cho Claude Desktop\n');

    // --- Step 1: Node.js — checked by the wrapper / npx; nothing to do here ---

    // --- Step 2: Claude Desktop config ---
    const configPath = updateClaudeConfig();
    console.log();
    console.log(`Cai dat config Finhay MCP Claude Desktop thanh cong ${configPath}`);
    console.log();

    // --- Step 3: Credentials ---
    type CredsAction = 'create' | 'update' | 'reuse';
    let credsAction: CredsAction = 'create';

    console.log('Xac thuc ket noi tai khoan FHSC');

    if (fs.existsSync(CREDENTIALS_PATH)) {
        const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
        const keyMatch = content.match(/FINHAY_API_KEY=(.+)/);
        const secretMatch = content.match(/FINHAY_API_SECRET=(.+)/);

        if (keyMatch && secretMatch) {
            const maskedKey = keyMatch[1].trim().slice(0, 8) + '***';
            console.log(`Tim thay thong tin Credentials ${CREDENTIALS_PATH}`);
            console.log(`API Key: ${maskedKey}`);
            console.log('Secret Key: ******\n');

            const replace = await ask('Ban co muon thay the khong? (y/n): ');
            credsAction = replace.toLowerCase() === 'y' ? 'update' : 'reuse';
            console.log();
        }
    }

    if (credsAction === 'create' || credsAction === 'update') {
        const apiKey = credsAction === 'update'
            ? await ask('Nhap API Key moi: ')
            : await ask('Nhap API Key: ');
        if (!apiKey) {
            console.error('\n  Loi: API Key khong duoc de trong.\n');
            process.exit(1);
        }

        const apiSecret = credsAction === 'update'
            ? await askMasked('Nhap Secret Key moi: ')
            : await askMasked('Nhap Secret Key: ');
        if (!apiSecret) {
            console.error('\n  Loi: Secret Key khong duoc de trong.\n');
            process.exit(1);
        }

        upsertEnvFile(CREDENTIALS_PATH, {
            FINHAY_API_KEY: apiKey,
            FINHAY_API_SECRET: apiSecret,
            FINHAY_BASE_URL: 'https://open-api.fhsc.com.vn',
        });
        console.log();
    }

    if (credsAction === 'create') {
        console.log(`Tao Credentials thanh cong tai ${CREDENTIALS_PATH}`);
    } else if (credsAction === 'update') {
        console.log(`Cap nhat Credentials thanh cong tai ${CREDENTIALS_PATH}`);
    } else {
        console.log(`Su dung credentials hien co tai ${CREDENTIALS_PATH}`);
    }
    console.log();
    console.log('Hay khoi dong lai ung dung de su dung');
    console.log();
}

export const run = main().catch((err) => {
    console.error('Loi:', err.message);
    process.exit(1);
});
