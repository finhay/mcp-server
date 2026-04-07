const vndFmt = new Intl.NumberFormat('vi-VN');

export function formatVND(amount: number): string {
    return vndFmt.format(amount) + 'đ';
}

export function formatVolume(vol: number): string {
    if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(1) + 'M';
    if (vol >= 1_000) return (vol / 1_000).toFixed(0) + 'K';
    return String(vol);
}

export function formatPercent(pct: number): string {
    return (pct > 0 ? '+' : '') + pct.toFixed(2) + '%';
}
