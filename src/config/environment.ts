export interface Config {
    apiKey: string;
    apiSecret: string;
    baseUrl: string;
}

export function getConfig(): Config {
    const apiKey = process.env.FINHAY_API_KEY;
    const apiSecret = process.env.FINHAY_API_SECRET;
    const baseUrl = process.env.FINHAY_BASE_URL || 'https://open-api.fhsc.com.vn';

    if (!apiKey) {
        console.error('Error: FINHAY_API_KEY env var is required.');
        process.exit(1);
    }

    if (!apiSecret) {
        console.error('Error: FINHAY_API_SECRET env var is required.');
        process.exit(1);
    }

    return { apiKey, apiSecret, baseUrl };
}
