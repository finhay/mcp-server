import { describe, it, expect } from 'vitest';
import { HmacSigner } from '../client/HmacSigner.js';

describe('HmacSigner', () => {
    const secret = 'test-secret-key';
    const signer = new HmacSigner(secret);

    describe('buildPayload', () => {
        it('should build payload without query string', () => {
            const result = signer.buildPayload('1700000000', 'GET', '/market/stock', null, '');
            expect(result).toBe('1700000000\nGET\n/market/stock\n');
        });

        it('should build payload with query string', () => {
            const result = signer.buildPayload('1700000000', 'GET', '/market/stock', 'symbol=VNM', '');
            expect(result).toBe('1700000000\nGET\n/market/stock?symbol=VNM\n');
        });

        it('should build payload with body hash', () => {
            const bodyHash = HmacSigner.sha256('{"symbol":"VNM"}');
            const result = signer.buildPayload('1700000000', 'POST', '/trading/order', null, bodyHash);
            expect(result).toBe(`1700000000\nPOST\n/trading/order\n${bodyHash}`);
        });

        it('should uppercase the method', () => {
            const result = signer.buildPayload('1700000000', 'get', '/market/stock', null, '');
            expect(result).toBe('1700000000\nGET\n/market/stock\n');
        });
    });

    describe('sign', () => {
        it('should return a 64-char hex HMAC-SHA256', () => {
            const sig = signer.sign('test-payload');
            expect(sig).toMatch(/^[0-9a-f]{64}$/);
        });

        it('should produce consistent signatures for same input', () => {
            const sig1 = signer.sign('same-payload');
            const sig2 = signer.sign('same-payload');
            expect(sig1).toBe(sig2);
        });

        it('should produce different signatures for different inputs', () => {
            const sig1 = signer.sign('payload-a');
            const sig2 = signer.sign('payload-b');
            expect(sig1).not.toBe(sig2);
        });

        it('should produce different signatures for different secrets', () => {
            const otherSigner = new HmacSigner('different-secret');
            const sig1 = signer.sign('same-payload');
            const sig2 = otherSigner.sign('same-payload');
            expect(sig1).not.toBe(sig2);
        });
    });

    describe('sha256', () => {
        it('should return a 64-char hex SHA256 hash', () => {
            const hash = HmacSigner.sha256('hello');
            expect(hash).toMatch(/^[0-9a-f]{64}$/);
        });

        it('should produce consistent hashes', () => {
            const h1 = HmacSigner.sha256('test');
            const h2 = HmacSigner.sha256('test');
            expect(h1).toBe(h2);
        });

        it('should match known SHA256 value', () => {
            // SHA256 of empty string
            const hash = HmacSigner.sha256('');
            expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
        });
    });
});
