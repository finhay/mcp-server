import axios from 'axios';

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: true };

/**
 * Wraps an async handler so that errors are caught and returned
 * as MCP error responses instead of crashing the server.
 */
export function safeHandler<T>(
    fn: (args: T) => Promise<string>,
): (args: T) => Promise<ToolResult> {
    return async (args: T) => {
        try {
            const text = await fn(args);
            return { content: [{ type: 'text' as const, text }] };
        } catch (err: unknown) {
            const message = formatError(err);
            return { content: [{ type: 'text' as const, text: message }], isError: true };
        }
    };
}

function formatError(err: unknown): string {
    if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const body = err.response?.data;
        const detail = typeof body === 'object' ? JSON.stringify(body, null, 2) : String(body ?? '');
        return `API error ${status ?? 'NETWORK'}: ${err.message}${detail ? `\n${detail}` : ''}`;
    }
    if (err instanceof Error) {
        return `Error: ${err.message}`;
    }
    return `Error: ${String(err)}`;
}
