import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface Config {
    apiKey: string;
    apiSecret: string;
    baseUrl: string;
}

/** Shared credential path — same as finhay-skills-hub */
export const CREDENTIALS_PATH = path.join(os.homedir(), '.finhay', 'credentials', '.env');

/**
 * Load credentials from ~/.finhay/credentials/.env into process.env
 * (only sets vars that are not already defined).
 */
function loadCredentialsFile(): void {
    if (!fs.existsSync(CREDENTIALS_PATH)) return;

    const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
    for (const line of content.split('\n')) {
        const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
        if (match && !process.env[match[1]]) {
            process.env[match[1]] = match[2];
        }
    }
}

export function getConfig(): Config {
    // Load from shared credentials file first, then env vars can override
    loadCredentialsFile();

    const apiKey = process.env.FINHAY_API_KEY;
    const apiSecret = process.env.FINHAY_API_SECRET;
    const baseUrl = process.env.FINHAY_BASE_URL || 'https://open-api.fhsc.com.vn';

    if (!apiKey || !apiSecret) {
        console.error(`Error: FINHAY_API_KEY and FINHAY_API_SECRET are required.`);
        console.error(`Run "npx @finhay/mcp-server --install" to set up credentials.`);
        console.error(`Or create ${CREDENTIALS_PATH} manually.`);
        process.exit(1);
    }

    return { apiKey, apiSecret, baseUrl };
}
