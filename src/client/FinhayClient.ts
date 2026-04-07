import axios, { AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';
import { HmacSigner } from './HmacSigner.js';

export class FinhayClient {
    private readonly http: AxiosInstance;
    private readonly signer: HmacSigner;
    private readonly apiKey: string;

    constructor(baseUrl: string, apiKey: string, apiSecret: string) {
        this.apiKey = apiKey;
        this.signer = new HmacSigner(apiSecret);
        this.http = axios.create({
            baseURL: baseUrl,
            timeout: 15000,
        });
    }

    /**
     * GET request with HMAC signing.
     */
    async get(path: string, query?: Record<string, string>): Promise<any> {
        const queryString = query
            ? Object.entries(query).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
            : null;

        const fullPath = queryString ? `${path}?${queryString}` : path;
        const timestamp = String(Date.now());
        const nonce = randomUUID();
        const bodyHash = '';

        const payload = this.signer.buildPayload(timestamp, 'GET', path, queryString, null);
        const signature = this.signer.sign(payload);

        const headers = {
            'X-FH-APIKEY': this.apiKey,
            'X-FH-TIMESTAMP': timestamp,
            'X-FH-NONCE': nonce,
            'X-FH-SIGNATURE': signature,
            'X-FH-BODYHASH': bodyHash,
            'X-Origin-Method': 'GET',
            'X-Origin-Path': path,
            ...(queryString ? { 'X-Origin-Query': queryString } : {}),
        };

        const response = await this.http.get(fullPath, { headers });

        return response.data;
    }

    /**
     * POST request with HMAC signing + body hash.
     */
    async post(path: string, body: Record<string, any>): Promise<any> {
        return this.writeRequest('POST', path, body);
    }

    /**
     * PUT request with HMAC signing + body hash.
     */
    async put(path: string, body: Record<string, any>): Promise<any> {
        return this.writeRequest('PUT', path, body);
    }

    /**
     * DELETE request with HMAC signing + body hash.
     */
    async delete(path: string, body: Record<string, any>): Promise<any> {
        return this.writeRequest('DELETE', path, body);
    }

    private async writeRequest(method: string, path: string, body: Record<string, any>): Promise<any> {
        const bodyStr = JSON.stringify(body);
        const bodyHash = HmacSigner.sha256(bodyStr);
        const timestamp = String(Date.now());
        const nonce = randomUUID();

        const payload = this.signer.buildPayload(timestamp, method, path, null, bodyHash);
        const signature = this.signer.sign(payload);

        const headers = {
            'X-FH-APIKEY': this.apiKey,
            'X-FH-TIMESTAMP': timestamp,
            'X-FH-NONCE': nonce,
            'X-FH-SIGNATURE': signature,
            'X-FH-BODYHASH': bodyHash,
            'X-Origin-Method': method.toUpperCase(),
            'X-Origin-Path': path,
            'Content-Type': 'application/json',
        };

        const response = await this.http.request({
            method,
            url: path,
            data: body,
            headers,
        });

        return response.data;
    }
}
