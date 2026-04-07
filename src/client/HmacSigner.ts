import crypto from 'crypto';

export class HmacSigner {
    constructor(private readonly secret: string) {}

    /**
     * Build HMAC payload.
     * Format: {timestamp}\n{METHOD}\n{path}{?query}\n{bodyHash}
     */
    buildPayload(
        timestamp: string,
        method: string,
        path: string,
        queryString: string | null,
        bodyHash: string | null,
    ): string {
        let payload = `${timestamp}\n${method.toUpperCase()}\n${path}`;
        if (queryString) {
            payload += `?${queryString}`;
        }
        payload += '\n';
        if (bodyHash) {
            payload += bodyHash;
        }
        return payload;
    }

    /** HMAC-SHA256 sign */
    sign(payload: string): string {
        return crypto
            .createHmac('sha256', this.secret)
            .update(payload, 'utf8')
            .digest('hex');
    }

    /** SHA256 hash (for body) */
    static sha256(input: string): string {
        return crypto
            .createHash('sha256')
            .update(input, 'utf8')
            .digest('hex');
    }
}
